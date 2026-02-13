"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "./WalletProvider";
import { getJouleBalance, formatJouleBalance, transferJoule } from "@/lib/soroban";
import { JOULE_TOKEN, STELLAR_EXPERT_BASE, TOKEN_DECIMALS } from "@/lib/constants";
import { toStroops } from "@/lib/swap";

function parseTransferError(message: string): string {
  if (message.includes("User declined") || message.includes("rejected") || message.includes("-1")) {
    return "Transaction was cancelled.";
  }
  if (message.includes("not within the allowed range") || message.includes("#1")) {
    return "Insufficient JOULE balance.";
  }
  const codeMatch = message.match(/Error\(Contract, #(\d+)\)/);
  if (codeMatch) {
    return `Transfer failed (contract error #${codeMatch[1]}).`;
  }
  return message;
}

export function WalletDashboard() {
  const { publicKey, connected, signTransaction } = useWallet();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);

  // Transfer state
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);

  // Fetch balance when wallet connects
  const fetchBalance = useCallback(async () => {
    if (!publicKey) {
      setBalance(null);
      return;
    }
    setLoading(true);
    try {
      const bal = await getJouleBalance(publicKey);
      setBalance(bal);
    } catch (err) {
      console.error("Failed to fetch balance:", err);
      setBalance(0n);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    fetchBalance();
    // Refresh balance every 30 seconds while connected
    if (!publicKey) return;
    const interval = setInterval(fetchBalance, 30_000);
    return () => clearInterval(interval);
  }, [publicKey, fetchBalance]);

  const handleTransfer = useCallback(async () => {
    if (!publicKey || !recipient || !amount) return;

    // Validate recipient
    if (!recipient.startsWith("G") && !recipient.startsWith("C")) {
      setError("Invalid address. Must start with G (account) or C (contract).");
      return;
    }
    if (recipient.startsWith("G") && recipient.length !== 56) {
      setError("Invalid Stellar address (must be 56 characters).");
      return;
    }
    if (recipient.startsWith("C") && recipient.length !== 56) {
      setError("Invalid contract address (must be 56 characters).");
      return;
    }

    const amountStroops = toStroops(amount);
    if (amountStroops <= 0n) {
      setError("Amount must be greater than 0.");
      return;
    }
    if (balance !== null && amountStroops > balance) {
      setError("Amount exceeds your balance.");
      return;
    }

    setTransferring(true);
    setError(null);
    setTxHash(null);

    try {
      const hash = await transferJoule({
        from: publicKey,
        to: recipient,
        amount: amountStroops,
        signTransaction,
      });
      setTxHash(hash);
      setAmount("");
      setRecipient("");
      // Refresh balance
      fetchBalance();
    } catch (err: any) {
      console.error("Transfer error:", err);
      setError(parseTransferError(err.message || "Transfer failed"));
    } finally {
      setTransferring(false);
    }
  }, [publicKey, recipient, amount, balance, signTransaction, fetchBalance]);

  if (!connected) return null;

  const displayBalance = loading
    ? "..."
    : balance !== null
    ? formatJouleBalance(balance)
    : "0";

  return (
    <section className="py-12 px-6">
      <div className="max-w-md mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8">Your Wallet</h2>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
          {/* Balance display */}
          <div className="text-center mb-6">
            <div className="text-sm text-gray-400 mb-2">JOULE Balance</div>
            <div className="text-4xl font-mono font-bold text-joule-400 mb-1">
              {displayBalance}
            </div>
            <div className="text-sm text-gray-500">JOULE</div>
            <button
              onClick={fetchBalance}
              disabled={loading}
              className="mt-3 text-xs text-gray-500 hover:text-gray-300 transition"
            >
              {loading ? "Refreshing..." : "Refresh balance"}
            </button>
          </div>

          {/* Connected address */}
          <div className="rounded-lg bg-white/5 p-3 mb-4">
            <div className="text-xs text-gray-500 mb-1">Connected Address</div>
            <a
              href={`https://stellar.expert/explorer/public/account/${publicKey}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-joule-400 hover:text-joule-300 transition break-all"
            >
              {publicKey}
            </a>
          </div>

          {/* Token info */}
          <div className="rounded-lg bg-white/5 p-3 mb-6">
            <div className="text-xs text-gray-500 mb-1">Token Contract</div>
            <a
              href={`${STELLAR_EXPERT_BASE}/${JOULE_TOKEN}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-joule-400 hover:text-joule-300 transition break-all"
            >
              {JOULE_TOKEN}
            </a>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span>Name: Joule Compute Credit</span>
              <span>Symbol: JOULE</span>
              <span>Decimals: {TOKEN_DECIMALS}</span>
            </div>
          </div>

          {/* Transfer toggle */}
          <button
            onClick={() => {
              setShowTransfer(!showTransfer);
              setError(null);
              setTxHash(null);
            }}
            className="w-full rounded-xl bg-joule-600/20 border border-joule-500/30 py-2.5 text-sm font-semibold text-joule-400 hover:bg-joule-600/30 transition mb-4"
          >
            {showTransfer ? "Hide Transfer" : "Transfer JOULE"}
          </button>

          {/* Transfer form */}
          {showTransfer && (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Recipient Address
                </label>
                <input
                  type="text"
                  placeholder="G... or C..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value.trim())}
                  className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-sm font-mono text-white placeholder:text-gray-600 outline-none focus:border-joule-500/50 transition"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Amount (JOULE)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 rounded-xl bg-white/5 border border-white/10 p-3 text-sm font-mono text-white placeholder:text-gray-600 outline-none focus:border-joule-500/50 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  {balance !== null && balance > 0n && (
                    <button
                      onClick={() => setAmount(formatJouleBalance(balance))}
                      className="text-xs text-joule-400 hover:text-joule-300 px-2 py-1 rounded bg-joule-600/20 transition"
                    >
                      Max
                    </button>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-red-900/30 border border-red-800/50 p-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {/* Success */}
              {txHash && (
                <div className="rounded-lg bg-joule-900/30 border border-joule-700/50 p-3 text-sm text-joule-300">
                  Transfer successful!{" "}
                  <a
                    href={`https://stellar.expert/explorer/public/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-joule-200"
                  >
                    View transaction
                  </a>
                </div>
              )}

              <button
                onClick={handleTransfer}
                disabled={transferring || !recipient || !amount}
                className="w-full rounded-xl bg-joule-600 py-3 text-sm font-semibold text-white hover:bg-joule-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {transferring ? "Sending..." : "Send JOULE"}
              </button>

              <p className="text-xs text-gray-600 text-center">
                Transfers are fee-free. Standard Stellar network fee applies (~0.00001 XLM).
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
