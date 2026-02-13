import {
  Address,
  Contract,
  TransactionBuilder,
  xdr,
  nativeToScVal,
  scValToNative,
  Memo,
  TimeoutInfinite,
} from '@stellar/stellar-sdk';
import { rpc } from '@stellar/stellar-sdk';
import {
  SUSHI_ROUTER,
  JOULE_TOKEN,
  USDC_SAC,
  POOL_FEE,
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
 * Build the ExactInputParams struct for SushiSwap V3
 */
function buildSwapParams(
  sender: string,
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
  amountOutMin: bigint,
  deadline: number,
): xdr.ScVal {
  return xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('amount_in'),
      val: buildI128(amountIn),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('amount_out_minimum'),
      val: buildI128(amountOutMin),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('deadline'),
      val: xdr.ScVal.scvU64(xdr.Uint64.fromString(deadline.toString())),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('fees'),
      val: xdr.ScVal.scvVec([xdr.ScVal.scvU32(POOL_FEE)]),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('path'),
      val: xdr.ScVal.scvVec([
        Address.fromString(tokenIn).toScVal(),
        Address.fromString(tokenOut).toScVal(),
      ]),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('recipient'),
      val: Address.fromString(sender).toScVal(),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('sender'),
      val: Address.fromString(sender).toScVal(),
    }),
  ]);
}

export interface QuoteResult {
  amountOut: string; // Human-readable
  amountOutRaw: bigint;
}

/**
 * Get a swap quote via SushiSwap V3 Router quote_exact_input (read-only simulation)
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

  const deadline = Math.floor(Date.now() / 1000) + 300;
  const params = buildSwapParams(sender, tokenIn, tokenOut, amountInStroops, 0n, deadline);

  const contract = new Contract(SUSHI_ROUTER);
  const account = await server.getAccount(sender);

  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('quote_exact_input', params))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Quote simulation failed: ${simResult.error}`);
  }

  const resultXdr = (simResult as rpc.Api.SimulateTransactionSuccessResponse).result?.retval;
  if (!resultXdr) {
    throw new Error('No result from quote simulation');
  }

  const result = scValToNative(resultXdr);
  const amountOut = BigInt(result?.amount ?? result);

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
 * Execute a swap via SushiSwap V3 Router swap_exact_input
 * Flow: build tx → simulate → assemble → sign via wallet → submit
 */
export async function executeSwap(params: SwapParams): Promise<string> {
  const { sender, tokenIn, tokenOut, amountIn, minAmountOut, signTransaction } = params;

  const amountInStroops = toStroops(amountIn);
  const deadline = Math.floor(Date.now() / 1000) + 300; // 5 min deadline

  const swapParams = buildSwapParams(sender, tokenIn, tokenOut, amountInStroops, minAmountOut, deadline);

  const contract = new Contract(SUSHI_ROUTER);
  const account = await server.getAccount(sender);

  const tx = new TransactionBuilder(account, {
    fee: '10000000', // 1 XLM max fee for Soroban
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('swap_exact_input', swapParams))
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
