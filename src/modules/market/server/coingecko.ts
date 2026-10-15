import "server-only";
import type { CandleSeries, CoinMarket, GlobalStats, SearchHit } from "../types";
import type { MarketProvider } from "./provider";

// CoinGecko API v3. Docs: https://docs.coingecko.com/reference/introduction
// The key (if any) is attached here on the server and never reaches the browser.

function config() {
  const key = process.env.COINGECKO_API_KEY?.trim();
  const pro = process.env.COINGECKO_API_PLAN === "pro" && !!key;
  return {
    baseUrl: pro ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3",
    headers: key ? { [pro ? "x-cg-pro-api-key" : "x-cg-demo-api-key"]: key } : undefined,
    cacheSeconds: Math.max(10, Number(process.env.MARKET_CACHE_SECONDS) || 60),
  };
}

async function cg<T>(path: string, params: Record<string, string | number | boolean> = {}, cacheSeconds?: number): Promise<T> {
  const { baseUrl, headers, cacheSeconds: defaultCache } = config();
  const url = new URL(baseUrl + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const res = await fetch(url, {
    headers: { accept: "application/json", ...headers },
    next: { revalidate: cacheSeconds ?? defaultCache },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 429) throw new Error("CoinGecko rate limit reached");
  if (!res.ok) throw new Error(`CoinGecko responded ${res.status}`);
  return (await res.json()) as T;
}

interface CgMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  market_cap_rank: number | null;
  current_price: number | null;
  market_cap: number | null;
  total_volume: number | null;
  high_24h: number | null;
  low_24h: number | null;
  circulating_supply: number | null;
  total_supply: number | null;
  max_supply: number | null;
  ath: number | null;
  ath_change_percentage: number | null;
  ath_date: string | null;
  sparkline_in_7d?: { price: number[] };
  price_change_percentage_1h_in_currency?: number | null;
  price_change_percentage_24h_in_currency?: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  price_change_percentage_30d_in_currency?: number | null;
  price_change_percentage_1y_in_currency?: number | null;
}

function mapMarket(m: CgMarket): CoinMarket {
  return {
    id: m.id,
    symbol: m.symbol,
    name: m.name,
    image: m.image,
    rank: m.market_cap_rank,
    price: m.current_price ?? 0,
    marketCap: m.market_cap ?? 0,
    volume24h: m.total_volume ?? 0,
    high24h: m.high_24h,
    low24h: m.low_24h,
    change1h: m.price_change_percentage_1h_in_currency ?? null,
    change24h: m.price_change_percentage_24h_in_currency ?? null,
    change7d: m.price_change_percentage_7d_in_currency ?? null,
    change30d: m.price_change_percentage_30d_in_currency ?? null,
    change1y: m.price_change_percentage_1y_in_currency ?? null,
    circulatingSupply: m.circulating_supply,
    totalSupply: m.total_supply,
    maxSupply: m.max_supply,
    ath: m.ath,
    athChangePct: m.ath_change_percentage,
    athDate: m.ath_date,
    sparkline7d: m.sparkline_in_7d?.price ?? [],
  };
}

interface CgSearchCoin {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
  market_cap_rank: number | null;
}

export const coinGeckoProvider: MarketProvider = {
  async getMarkets({ perPage, page, ids }) {
    const rows = await cg<CgMarket[]>("/coins/markets", {
      vs_currency: "usd",
      order: "market_cap_desc",
      per_page: perPage,
      page,
      sparkline: true,
      price_change_percentage: "1h,24h,7d,30d,1y",
      ...(ids?.length ? { ids: ids.join(",") } : {}),
    });
    return rows.map(mapMarket);
  },

  async getGlobal(): Promise<GlobalStats> {
    const { data } = await cg<{
      data: {
        total_market_cap: Record<string, number>;
        total_volume: Record<string, number>;
        market_cap_change_percentage_24h_usd: number;
        active_cryptocurrencies: number;
        markets: number;
        market_cap_percentage: Record<string, number>;
      };
    }>("/global");
    return {
      totalMarketCap: data.total_market_cap.usd,
      totalVolume24h: data.total_volume.usd,
      marketCapChange24h: data.market_cap_change_percentage_24h_usd,
      activeCryptocurrencies: data.active_cryptocurrencies,
      markets: data.markets,
      dominance: data.market_cap_percentage,
    };
  },

  async getCandles(id, days): Promise<CandleSeries> {
    // OHLC has no volume, so volume comes from market_chart. CoinGecko picks the
    // candle size from `days`: 30 min (1-2d), 4 h (3-30d), 4 days (31d+).
    const [ohlc, chart] = await Promise.all([
      cg<[number, number, number, number, number][]>(`/coins/${encodeURIComponent(id)}/ohlc`, { vs_currency: "usd", days }),
      cg<{ total_volumes: [number, number][] }>(`/coins/${encodeURIComponent(id)}/market_chart`, { vs_currency: "usd", days }),
    ]);

    const candles = ohlc.map(([t, open, high, low, close]) => ({ time: Math.floor(t / 1000), open, high, low, close }));
    return { candles, volumes: bucketVolumes(candles.map((c) => c.time), chart.total_volumes) };
  },

  async search(query) {
    const { coins } = await cg<{ coins: CgSearchCoin[] }>("/search", { query }, 300);
    return coins.slice(0, 12).map((c) => ({ id: c.id, name: c.name, symbol: c.symbol, thumb: c.thumb, rank: c.market_cap_rank }));
  },

  async getTrending() {
    const { coins } = await cg<{ coins: { item: CgSearchCoin & { small: string } }[] }>("/search/trending", {}, 300);
    return coins.map(({ item }) => ({ id: item.id, name: item.name, symbol: item.symbol, thumb: item.small ?? item.thumb, rank: item.market_cap_rank }));
  },
};

/**
 * market_chart volumes are rolling 24h totals sampled more often than candles.
 * For each candle we take the latest volume sample at or before its close so
 * the histogram lines up with the candles.
 */
function bucketVolumes(candleTimes: number[], samples: [number, number][]): { time: number; value: number }[] {
  if (!candleTimes.length || !samples.length) return [];
  const pts = samples.map(([t, v]) => [Math.floor(t / 1000), v] as const);
  let j = 0;
  return candleTimes.map((time) => {
    while (j + 1 < pts.length && pts[j + 1][0] <= time) j++;
    return { time, value: pts[j][1] };
  });
}
