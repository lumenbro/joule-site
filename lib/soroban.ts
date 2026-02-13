import {
  Address,
  Contract,
  TransactionBuilder,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';
import { rpc } from '@stellar/stellar-sdk';
import { JOULE_TOKEN, RPC_URL, NETWORK_PASSPHRASE, TOKEN_DECIMALS } from './constants';

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
 * Read JOULE balance for an address via contract.balance(id)
 */
export async function getJouleBalance(address: string): Promise<bigint> {
  const contract = new Contract(JOULE_TOKEN);
  const account = await server.getAccount(address);

  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('balance', Address.fromString(address).toScVal()))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(sim)) {
    console.error('Balance simulation error:', sim.error);
    return 0n;
  }

  const retval = (sim as rpc.Api.SimulateTransactionSuccessResponse).result?.retval;
  if (!retval) return 0n;

  const raw = scValToNative(retval);
  return BigInt(raw);
}

/**
 * Format raw balance (7 decimals) to human-readable string
 */
export function formatJouleBalance(raw: bigint): string {
  if (raw === 0n) return '0';
  const str = raw.toString().padStart(TOKEN_DECIMALS + 1, '0');
  const whole = str.slice(0, str.length - TOKEN_DECIMALS);
  let frac = str.slice(str.length - TOKEN_DECIMALS);
  // Trim trailing zeros but keep at least 2 decimal places
  frac = frac.replace(/0+$/, '');
  if (frac.length < 2) frac = frac.padEnd(2, '0');
  return `${whole}.${frac}`;
}

/**
 * Build, simulate, and return a signed JOULE transfer transaction.
 * Caller must provide signTransaction from wallet kit.
 */
export async function transferJoule(params: {
  from: string;
  to: string;
  amount: bigint;
  signTransaction: (xdr: string, opts?: { networkPassphrase?: string; address?: string }) => Promise<{ signedTxXdr: string }>;
}): Promise<string> {
  const { from, to, amount, signTransaction } = params;

  const contract = new Contract(JOULE_TOKEN);
  const account = await server.getAccount(from);

  const tx = new TransactionBuilder(account, {
    fee: '10000000', // 1 XLM max fee for Soroban
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'transfer',
        Address.fromString(from).toScVal(),
        Address.fromString(to).toScVal(),
        buildI128(amount),
      )
    )
    .setTimeout(300)
    .build();

  // Simulate
  const sim = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Transfer simulation failed: ${sim.error}`);
  }

  // Assemble (adds Soroban resource footprint + auth)
  const assembled = rpc.assembleTransaction(tx, sim).build();
  const txXdr = assembled.toXDR();

  // Sign via wallet
  const { signedTxXdr } = await signTransaction(txXdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: from,
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
