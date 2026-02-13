"use client";

import { useEffect, useRef, useState } from "react";
import { fetchOracleTicks, getTimeRangeSince, type OracleTick } from "@/lib/supabase";

type TimeRange = "24h" | "7d" | "30d" | "all";

export function GpuChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const [range, setRange] = useState<TimeRange>("7d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!chartRef.current) return;

      const { createChart, ColorType, LineStyle } = await import("lightweight-charts");

      // Dispose previous chart
      if (chartInstance.current) {
        chartInstance.current.remove();
      }

      const chart = createChart(chartRef.current, {
        width: chartRef.current.clientWidth,
        height: 300,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#9ca3af",
          fontSize: 12,
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.04)" },
          horzLines: { color: "rgba(255,255,255,0.04)" },
        },
        crosshair: {
          vertLine: { labelBackgroundColor: "#16a34a" },
          horzLine: { labelBackgroundColor: "#16a34a" },
        },
        timeScale: {
          borderColor: "rgba(255,255,255,0.1)",
          timeVisible: true,
        },
        rightPriceScale: {
          borderColor: "rgba(255,255,255,0.1)",
        },
      });

      const series = chart.addAreaSeries({
        lineColor: "#22c55e",
        topColor: "rgba(34,197,94,0.3)",
        bottomColor: "rgba(34,197,94,0.02)",
        lineWidth: 2,
        priceFormat: {
          type: "price",
          precision: 4,
          minMove: 0.0001,
        },
      });

      chartInstance.current = chart;
      seriesRef.current = series;

      // Handle resize
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          chart.applyOptions({ width: entry.contentRect.width });
        }
      });
      resizeObserver.observe(chartRef.current);

      if (cancelled) return;

      await loadData();

      return () => {
        resizeObserver.disconnect();
        chart.remove();
      };
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []); // Only init once

  useEffect(() => {
    loadData();
  }, [range]);

  async function loadData() {
    setLoading(true);
    const since = getTimeRangeSince(range);
    const ticks = await fetchOracleTicks(since);

    if (seriesRef.current && ticks.length > 0) {
      const data = ticks.map((t) => ({
        time: Math.floor(new Date(t.recorded_at).getTime() / 1000) as any,
        value: Number(t.gpu_hourly_rate),
      }));
      seriesRef.current.setData(data);
      chartInstance.current?.timeScale().fitContent();
    }
    setLoading(false);
  }

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">GPU Index (H100 $/hr)</h3>
        <div className="flex gap-1">
          {(["24h", "7d", "30d", "all"] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs rounded-lg transition ${
                range === r
                  ? "bg-joule-600 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div ref={chartRef} className="w-full" style={{ minHeight: 300 }}>
        {loading && (
          <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">
            Loading chart data...
          </div>
        )}
      </div>
    </div>
  );
}
