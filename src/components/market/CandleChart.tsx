"use client";

import { useEffect, useRef } from "react";
import { CandlestickSeries, ColorType, CrosshairMode, createChart, HistogramSeries, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import type { CandleSeries } from "@/modules/market/types";

const UP = "#19d9a0";
const DOWN = "#ff5c7c";

/** Interactive candlestick + volume chart (TradingView Lightweight Charts). */
export function CandleChart({ series, className = "h-[460px]" }: { series: CandleSeries | undefined; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const candles = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volume = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    if (!el.current) return;
    const c = createChart(el.current, {
      // Explicit locale: browsers can report tags (e.g. "en-US@posix") that Intl rejects.
      localization: { locale: "en-US" },
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#8a93b5", fontFamily: "Inter, ui-sans-serif, system-ui", attributionLogo: true },
      grid: { vertLines: { color: "rgba(148,163,255,0.05)" }, horzLines: { color: "rgba(148,163,255,0.05)" } },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: "rgba(34,211,238,0.4)", labelBackgroundColor: "#10162a" }, horzLine: { color: "rgba(34,211,238,0.4)", labelBackgroundColor: "#10162a" } },
      rightPriceScale: { borderColor: "rgba(148,163,255,0.12)" },
      timeScale: { borderColor: "rgba(148,163,255,0.12)", timeVisible: true, secondsVisible: false },
    });
    candles.current = c.addSeries(CandlestickSeries, { upColor: UP, downColor: DOWN, wickUpColor: UP, wickDownColor: DOWN, borderVisible: false, priceFormat: { type: "price", precision: 2, minMove: 0.01 } });
    volume.current = c.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "vol" });
    c.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    candles.current.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: 0.25 } });
    chart.current = c;
    return () => {
      c.remove();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    if (!series || !candles.current || !volume.current) return;
    const last = series.candles.at(-1)?.close ?? 1;
    // Show enough decimals for sub-dollar assets.
    const precision = last >= 1 ? 2 : last >= 0.01 ? 4 : last >= 0.0001 ? 6 : 8;
    candles.current.applyOptions({ priceFormat: { type: "price", precision, minMove: 1 / 10 ** precision } });
    candles.current.setData(series.candles.map((k) => ({ ...k, time: k.time as UTCTimestamp })));
    const byTime = new Map(series.candles.map((k) => [k.time, k.close >= k.open]));
    volume.current.setData(
      series.volumes.map((v) => ({ time: v.time as UTCTimestamp, value: v.value, color: byTime.get(v.time) === false ? "rgba(255,92,124,0.35)" : "rgba(25,217,160,0.35)" })),
    );
    chart.current?.timeScale().fitContent();
  }, [series]);

  return <div ref={el} className={`w-full ${className}`} />;
}
