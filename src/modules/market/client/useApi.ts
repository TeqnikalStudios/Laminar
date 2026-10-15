"use client";

import { useEffect, useState } from "react";
import type { ApiEnvelope, CandleSeries, CoinMarket, GlobalStats, SearchHit } from "../types";
import { reportSource } from "./sourceStore";

interface ApiState<T> {
  data: T | undefined;
  envelope: ApiEnvelope<T> | undefined;
  error: string | undefined;
  loading: boolean;
}

// One in-memory cache shared by every hook, so pages switch instantly and
// several components asking for the same URL make one request.
const cache = new Map<string, { at: number; value: ApiEnvelope<unknown> }>();
const inflight = new Map<string, Promise<ApiEnvelope<unknown>>>();

async function load<T>(url: string): Promise<ApiEnvelope<T>> {
  let p = inflight.get(url);
  if (!p) {
    p = fetch(url)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
        return body as ApiEnvelope<unknown>;
      })
      .finally(() => inflight.delete(url));
    inflight.set(url, p);
  }
  const value = await p;
  cache.set(url, { at: Date.now(), value });
  reportSource(value.source, value.notice, value.updatedAt);
  return value as ApiEnvelope<T>;
}

/** Fetches a LAMINAR API route and re-fetches every `refreshMs` (0 disables polling). */
export function useApi<T>(url: string | null, refreshMs = 60_000): ApiState<T> & { refresh: () => void } {
  const cached = url ? (cache.get(url)?.value as ApiEnvelope<T> | undefined) : undefined;
  const [state, setState] = useState<ApiState<T>>({ data: cached?.data, envelope: cached, error: undefined, loading: !cached && !!url });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!url) {
      setState({ data: undefined, envelope: undefined, error: undefined, loading: false });
      return;
    }
    let cancelled = false;
    const hit = cache.get(url)?.value as ApiEnvelope<T> | undefined;
    setState({ data: hit?.data, envelope: hit, error: undefined, loading: !hit });

    const run = () =>
      load<T>(url)
        .then((env) => !cancelled && setState({ data: env.data, envelope: env, error: undefined, loading: false }))
        .catch((e: Error) => !cancelled && setState((s) => ({ ...s, error: e.message, loading: false })));

    const fresh = cache.get(url);
    if (!fresh || Date.now() - fresh.at > 15_000 || tick > 0) run();
    const timer = refreshMs > 0 ? setInterval(() => document.visibilityState === "visible" && run(), refreshMs) : undefined;
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [url, refreshMs, tick]);

  return { ...state, refresh: () => setTick((t) => t + 1) };
}

export const useMarkets = (perPage = 100) => useApi<CoinMarket[]>(`/api/market/markets?perPage=${perPage}&page=1`);
export const useGlobal = () => useApi<GlobalStats>("/api/market/global");
export const useTrending = () => useApi<SearchHit[]>("/api/market/trending", 300_000);
export const useCandles = (id: string, days: number) => useApi<CandleSeries>(`/api/market/candles/${encodeURIComponent(id)}?days=${days}`, 120_000);

/** Market rows for specific coins (watchlist and portfolio entries outside the top 100). */
export function useCoins(ids: string[]) {
  const key = [...new Set(ids)].sort().join(",");
  return useApi<CoinMarket[]>(key ? `/api/market/markets?ids=${encodeURIComponent(key)}&perPage=${Math.max(1, ids.length)}` : null);
}
