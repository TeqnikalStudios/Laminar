// Shared market-data types. These are LAMINAR's own shapes: providers map
// their upstream responses into them so the UI never depends on a vendor format.

export type DataSource = "live" | "demo" | "demo-fallback";

export interface ApiEnvelope<T> {
  data: T;
  source: DataSource;
  /** ISO timestamp of when the server produced this response. */
  updatedAt: string;
  /** Present when source is "demo-fallback": why live data was unavailable. */
  notice?: string;
}

export interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  rank: number | null;
  price: number;
  marketCap: number;
  volume24h: number;
  high24h: number | null;
  low24h: number | null;
  change1h: number | null;
  change24h: number | null;
  change7d: number | null;
  change30d: number | null;
  change1y: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  ath: number | null;
  athChangePct: number | null;
  athDate: string | null;
  /** Hourly prices over the last 7 days, oldest first. */
  sparkline7d: number[];
}

export interface GlobalStats {
  totalMarketCap: number;
  totalVolume24h: number;
  marketCapChange24h: number;
  activeCryptocurrencies: number;
  markets: number;
  /** Market-cap dominance by lowercase symbol, in percent. */
  dominance: Record<string, number>;
}

export interface Candle {
  /** UNIX seconds, start of the candle. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface VolumeBar {
  time: number;
  value: number;
}

export interface CandleSeries {
  candles: Candle[];
  volumes: VolumeBar[];
}

export interface SearchHit {
  id: string;
  symbol: string;
  name: string;
  thumb: string;
  rank: number | null;
}

/** Chart ranges LAMINAR offers. Values are CoinGecko "days" parameters. */
export const CHART_RANGES = [
  { key: "1D", days: 1, label: "24 hours", candle: "30 min" },
  { key: "7D", days: 7, label: "7 days", candle: "4 hours" },
  { key: "30D", days: 30, label: "30 days", candle: "4 hours" },
  { key: "90D", days: 90, label: "90 days", candle: "4 days" },
  { key: "1Y", days: 365, label: "1 year", candle: "4 days" },
] as const;

export type ChartRangeKey = (typeof CHART_RANGES)[number]["key"];
export const ALLOWED_DAYS: readonly number[] = CHART_RANGES.map((r) => r.days);
