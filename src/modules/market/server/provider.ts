import "server-only";
import type { CandleSeries, CoinMarket, DataSource, GlobalStats, SearchHit } from "../types";
import { coinGeckoProvider } from "./coingecko";
import { demoProvider } from "./demo";

export interface MarketProvider {
  /** Coins ordered by market cap. `ids` restricts the result to those coins. */
  getMarkets(opts: { perPage: number; page: number; ids?: string[] }): Promise<CoinMarket[]>;
  getGlobal(): Promise<GlobalStats>;
  getCandles(id: string, days: number): Promise<CandleSeries>;
  search(query: string): Promise<SearchHit[]>;
  getTrending(): Promise<SearchHit[]>;
}

export interface Sourced<T> {
  data: T;
  source: DataSource;
  notice?: string;
}

function mode(): "live" | "demo" {
  return process.env.MARKET_DATA_MODE === "demo" ? "demo" : "live";
}

/**
 * Runs a provider call against the configured source. In live mode a failed
 * upstream call (rate limit, outage, blocked network) falls back to demo data
 * and says so, so the UI keeps working and can show the user why.
 */
export async function withMarketData<T>(fn: (p: MarketProvider) => Promise<T>): Promise<Sourced<T>> {
  if (mode() === "demo") return { data: await fn(demoProvider), source: "demo" };
  try {
    return { data: await fn(coinGeckoProvider), source: "live" };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`[market] live data unavailable, serving demo data: ${reason}`);
    return {
      data: await fn(demoProvider),
      source: "demo-fallback",
      notice: `Live market data is unavailable (${reason}). Showing demo data.`,
    };
  }
}
