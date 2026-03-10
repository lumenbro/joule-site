import {
  Address,
  Contract,
  TransactionBuilder,
  xdr,
  scValToNative,
} from '@stellar/stellar-sdk';
import { rpc } from '@stellar/stellar-sdk';
import {
  SOROSWAP_ROUTER,
  SOROSWAP_PAIR,
  LJOULE_SAC,
  USDC_SAC,
  LJOULE_IS_TOKEN0,
  RPC_URL,
  NETWORK_PASSPHRASE,
  TOKEN_DECIMALS,
} from './constants';

const server = new rpc.Server(RPC_URL);

// Helper to build i128 ScVal
function buildI128(amount: bigint): xdr.ScVal {
  const lo = amount & BigInt('0xFFFFFFFFFFFFFFFF');
  const hi = amount >> 64n;
  return xdr.ScVal.scvI128(
    new xdr.Int128Parts({
      lo: xdr.Uint64.fromString(lo.toString()),
      hi: xdr.Int64.fromString(hi.toString()),
    })
  );
}

/**
 * Convert human-readable amount to stroops (7 decimal places)
 */
export function toStroops(amount: string): bigint {
  const parts = amount.split('.');
  const whole = parts[0] || '0';
  const frac = (parts[1] || '').padEnd(TOKEN_DECIMALS, '0').slice(0, TOKEN_DECIMALS);
  return BigInt(whole + frac);
}

/**
 * Convert stroops to human-readable amount
 */
export function fromStroops(stroops: bigint): string {
  const str = stroops.toString().padStart(TOKEN_DECIMALS + 1, '0');
  const whole = str.slice(0, str.length - TOKEN_DECIMALS);
  const frac = str.slice(str.length - TOKEN_DECIMALS);
  return `${whole}.${frac}`;
}

/**
 * Ceiling division for bigint
 */
function ceilDiv(a: bigint, b: bigint): bigint {
  return (a + b - 1n) / b;
}

/**
 * Calculate swap output using Soroswap V2 constant-product formula.
 * Uses ceiling-div for the 0.3% fee (matches Soroswap's checked_ceiling_div).
 */
function calculateOutput(reserveIn: bigint, reserveOut: bigint, amountIn: bigint): bigint {
  if (reserveIn <= 0n || reserveOut <= 0n || amountIn <= 0n) return 0n;
  const fee = ceilDiv(amountIn * 3n, 1000n);
  const amountInAfterFee = amountIn - fee;
  return (reserveOut * amountInAfterFee) / (reserveIn + amountInAfterFee);
}

/**
 * Read reserves from the Soroswap V2 pair contract
 */
async function getReserves(sender: string): Promise<{ reserveLjoule: bigint; reserveUsdc: bigint }> {
  const pair = new Contract(SOROSWAP_PAIR);
  const account = await server.getAccount(sender);

  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(pair.call('get_reserves'))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Reserve simulation failed: ${sim.error}`);
  }

  const retval = (sim as rpc.Api.SimulateTransactionSuccessResponse).result?.retval;
  if (!retval) throw new Error('No result from get_reserves');

  const result = scValToNative(retval);
  const [r0, r1] = Array.isArray(result) ? result : [result.reserve0 ?? result[0], result.reserve1 ?? result[1]];

  return LJOULE_IS_TOKEN0
    ? { reserveLjoule: BigInt(r0), reserveUsdc: BigInt(r1) }
    : { reserveLjoule: BigInt(r1), reserveUsdc: BigInt(r0) };
}

export interface QuoteResult {
  amountOut: string; // Human-readable
  amountOutRaw: bigint;
}

/**
 * Get a swap quote by reading pair reserves and calculating output locally.
 * No on-chain simulation needed — pure math from Soroswap V2 constant-product formula.
 */
export async function getQuote(
  sender: string,
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
): Promise<QuoteResult> {
  const amountInStroops = toStroops(amountIn);
  if (amountInStroops <= 0n) {
    throw new Error('Amount must be greater than 0');
  }

  const { reserveLjoule, reserveUsdc } = await getReserves(sender);

  const isBuy = tokenIn === USDC_SAC; // USDC → LumenJoule
  const reserveIn = isBuy ? reserveUsdc : reserveLjoule;
  const reserveOut = isBuy ? reserveLjoule : reserveUsdc;

  const amountOut = calculateOutput(reserveIn, reserveOut, amountInStroops);

  if (amountOut <= 0n) {
    throw new Error('Insufficient liquidity for this trade');
  }

  return {
    amountOut: fromStroops(amountOut),
    amountOutRaw: amountOut,
  };
}

export interface SwapParams {
  sender: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut: bigint;
  signTransaction: (xdr: string, opts?: { networkPassphrase?: string; address?: string }) => Promise<{ signedTxXdr: string }>;
}

/**
 * Execute a swap via Soroswap V2 Router swap_exact_tokens_for_tokens.
 * Flow: build tx → simulate → assemble → sign via wallet → submit
 */
export async function executeSwap(params: SwapParams): Promise<string> {
  const { sender, tokenIn, tokenOut, amountIn, minAmountOut, signTransaction } = params;

  const amountInStroops = toStroops(amountIn);
  const deadline = Math.floor(Date.now() / 1000) + 300; // 5 min deadline

  const contract = new Contract(SOROSWAP_ROUTER);
  const account = await server.getAccount(sender);

  const tx = new TransactionBuilder(account, {
    fee: '10000000', // 1 XLM max fee for Soroban
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'swap_exact_tokens_for_tokens',
        buildI128(amountInStroops),
        buildI128(minAmountOut),
        xdr.ScVal.scvVec([
          Address.fromString(tokenIn).toScVal(),
          Address.fromString(tokenOut).toScVal(),
        ]),
        Address.fromString(sender).toScVal(),
        xdr.ScVal.scvU64(xdr.Uint64.fromString(deadline.toString())),
      )
    )
    .setTimeout(300)
    .build();

  // Simulate
  const simResult = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Swap simulation failed: ${simResult.error}`);
  }

  // Assemble (adds Soroban resource footprint + auth)
  const assembled = rpc.assembleTransaction(tx, simResult).build();
  const txXdr = assembled.toXDR();

  // Sign via wallet
  const { signedTxXdr } = await signTransaction(txXdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: sender,
  });

  // Submit
  const signedTx = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
  const submitResult = await server.sendTransaction(signedTx);

  if (submitResult.status === 'ERROR') {
    throw new Error(`Transaction submission failed: ${JSON.stringify(submitResult.errorResult)}`);
  }

  // Poll for result
  const hash = submitResult.hash;
  let getResult = await server.getTransaction(hash);

  while (getResult.status === 'NOT_FOUND') {
    await new Promise((r) => setTimeout(r, 2000));
    getResult = await server.getTransaction(hash);
  }

  if (getResult.status === 'FAILED') {
    throw new Error('Transaction failed on-chain');
  }

  return hash;
}
