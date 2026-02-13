"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useWallet } from "./WalletProvider";
import { JOULE_TOKEN, USDC_SAC } from "@/lib/constants";
import { getQuote, executeSwap, toStroops, type QuoteResult } from "@/lib/swap";

type Direction = "buy" | "sell"; // buy = USDC→JOULE, sell = JOULE→USDC

export function SwapCard() {
  const { publicKey, connected, connect, signTransaction } = useWallet();
  const [direction, setDirection] = useState<Direction>("buy");
  const [amountIn, setAmountIn] = useState("");
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slippage, setSlippage] = useState(1); // 1%
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const tokenIn = direction === "buy" ? USDC_SAC : JOULE_TOKEN;
  const tokenOut = direction === "buy" ? JOULE_TOKEN : USDC_SAC;
  const tokenInLabel = direction === "buy" ? "USDC" : "JOULE";
  const tokenOutLabel = direction === "buy" ? "JOULE" : "USDC";

  // Debounced quote fetching
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!amountIn || parseFloat(amountIn) <= 0 || !publicKey) {
      setQuote(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setQuoting(true);
      setError(null);
      try {
        const q = await getQuote(publicKey, tokenIn, tokenOut, amountIn);
        setQuote(q);
      } catch (err: any) {
        console.error("Quote error:", err);
        setError("Failed to get quote. Pool may have insufficient liquidity.");
        setQuote(null);
      } finally {
        setQuoting(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [amountIn, direction, publicKey, tokenIn, tokenOut]);

  const handleSwap = useCallback(async () => {
    if (!publicKey || !quote || !amountIn) return;
    setSwapping(true);
    setError(null);
    setTxHash(null);

    try {
      // Apply slippage to minimum output
      const minOut = (quote.amountOutRaw * BigInt(10000 - slippage * 100)) / 10000n;

      const hash = await executeSwap({
        sender: publicKey,
        tokenIn,
        tokenOut,
        amountIn,
        minAmountOut: minOut,
        signTransaction,
      });

      setTxHash(hash);
      setAmountIn("");
      setQuote(null);
    } catch (err: any) {
      console.error("Swap error:", err);
      setError(err.message || "Swap failed");
    } finally {
      setSwapping(false);
    }
  }, [publicKey, quote, amountIn, slippage, tokenIn, tokenOut, signTransaction]);

  const toggleDirection = () => {
    setDirection((d) => (d === "buy" ? "sell" : "buy"));
    setAmountIn("");
    setQuote(null);
    setError(null);
    setTxHash(null);
  };

  return (
    <section id="swap" className="py-20 px-6">
      <div className="max-w-md mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8">Swap</h2>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
          {/* Input */}
          <div className="mb-2">
            <label className="text-sm text-gray-400 mb-1 block">You pay</label>
            <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-4">
              <input
                type="number"
                placeholder="0.00"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                className="flex-1 bg-transparent text-xl font-mono outline-none text-white placeholder:text-gray-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-sm font-semibold text-gray-300 bg-white/10 px-3 py-1.5 rounded-lg">
                {tokenInLabel}
              </span>
            </div>
          </div>

          {/* Direction toggle */}
          <div className="flex justify-center -my-1 relative z-10">
            <button
              onClick={toggleDirection}
              className="w-10 h-10 rounded-xl bg-joule-600/20 border border-joule-500/30 flex items-center justify-center hover:bg-joule-600/30 transition"
            >
              <svg className="w-5 h-5 text-joule-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          {/* Output */}
          <div className="mb-4">
            <label className="text-sm text-gray-400 mb-1 block">You receive</label>
            <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="flex-1 text-xl font-mono text-white">
                {quoting ? (
                  <span className="text-gray-500">Quoting...</span>
                ) : quote ? (
                  quote.amountOut
                ) : (
                  <span className="text-gray-600">0.00</span>
                )}
              </div>
              <span className="text-sm font-semibold text-gray-300 bg-white/10 px-3 py-1.5 rounded-lg">
                {tokenOutLabel}
              </span>
            </div>
          </div>

          {/* Slippage */}
          <div className="flex items-center justify-between text-sm text-gray-400 mb-4 px-1">
            <span>Slippage tolerance</span>
            <div className="flex gap-1">
              {[0.5, 1, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => setSlippage(s)}
                  className={`px-2 py-0.5 rounded text-xs transition ${
                    slippage === s
                      ? "bg-joule-600 text-white"
                      : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {s}%
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-900/30 border border-red-800/50 p-3 mb-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Success */}
          {txHash && (
            <div className="rounded-lg bg-joule-900/30 border border-joule-700/50 p-3 mb-4 text-sm text-joule-300">
              Swap successful!{" "}
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

          {/* Action button */}
          {!connected ? (
            <button
              onClick={connect}
              className="w-full rounded-xl bg-joule-600 py-3.5 text-base font-semibold text-white hover:bg-joule-500 transition"
            >
              Connect Wallet
            </button>
          ) : (
            <button
              onClick={handleSwap}
              disabled={!quote || swapping || quoting || !amountIn}
              className="w-full rounded-xl bg-joule-600 py-3.5 text-base font-semibold text-white hover:bg-joule-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {swapping
                ? "Swapping..."
                : quoting
                ? "Getting quote..."
                : !amountIn
                ? "Enter an amount"
                : !quote
                ? "Enter an amount"
                : `Swap ${tokenInLabel} for ${tokenOutLabel}`}
            </button>
          )}

          {/* Pool info */}
          <p className="text-xs text-gray-600 text-center mt-4">
            Via SushiSwap V3 on Stellar (0.3% pool fee)
          </p>
        </div>
      </div>
    </section>
  );
}
