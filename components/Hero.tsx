"use client";

import { useEffect, useState } from "react";
import { fetchLatestTick, type OracleTick } from "@/lib/supabase";

export function Hero() {
  const [tick, setTick] = useState<OracleTick | null>(null);

  useEffect(() => {
    fetchLatestTick().then(setTick);
    const interval = setInterval(() => {
      fetchLatestTick().then(setTick);
    }, 60_000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const price = tick ? Number(tick.joule_price_usd).toFixed(6) : "...";
  const gpuRate = tick ? `$${Number(tick.gpu_hourly_rate).toFixed(4)}/hr` : "...";

  return (
    <section className="relative overflow-hidden py-24 px-6">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-joule-950/40 via-transparent to-transparent pointer-events-none" />

      <div className="relative max-w-5xl mx-auto text-center">
        {/* Logo */}
        <img
          src="/joule-icon.jpg"
          alt="JOULE"
          className="w-20 h-20 rounded-2xl border border-joule-500/30 mb-8 mx-auto"
        />

        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
          <span className="text-white">JOULE</span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 mb-12">
          Prepaid AI Compute Credits on Stellar
        </p>

        {/* Live Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto mb-12">
          <div className="rounded-xl bg-white/5 border border-white/10 p-5">
            <div className="text-sm text-gray-500 mb-1">JOULE Price</div>
            <div className="text-2xl font-mono font-bold text-joule-400">
              ${price}
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-5">
            <div className="text-sm text-gray-500 mb-1">GPU Index (H100)</div>
            <div className="text-2xl font-mono font-bold text-white">
              {gpuRate}
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-5">
            <div className="text-sm text-gray-500 mb-1">Denomination</div>
            <div className="text-2xl font-mono font-bold text-white">
              1 kJ
            </div>
          </div>
        </div>

        <a
          href="#swap"
          className="inline-flex items-center gap-2 rounded-xl bg-joule-600 px-8 py-3.5 text-lg font-semibold text-white hover:bg-joule-500 transition shadow-lg shadow-joule-600/25"
        >
          Buy JOULE
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </a>
      </div>
    </section>
  );
}
