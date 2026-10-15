import "server-only";
import type { Candle, CandleSeries, CoinMarket, GlobalStats, SearchHit } from "../types";
import type { MarketProvider } from "./provider";

// Offline sample data so LAMINAR runs with no network or API key
// (MARKET_DATA_MODE=demo) and keeps working if CoinGecko is unreachable.
// Prices are illustrative, not real quotes. The UI labels every demo response.

// [id, symbol, name, approximate price in USD, approximate market cap in USD billions]
const SEED: [string, string, string, number, number][] = [
  ["bitcoin", "btc", "Bitcoin", 112000, 2230],
  ["ethereum", "eth", "Ethereum", 4100, 495],
  ["tether", "usdt", "Tether", 1, 178],
  ["ripple", "xrp", "XRP", 2.8, 167],
  ["binancecoin", "bnb", "BNB", 1150, 160],
  ["solana", "sol", "Solana", 205, 111],
  ["usd-coin", "usdc", "USDC", 1, 75],
  ["dogecoin", "doge", "Dogecoin", 0.23, 35],
  ["tron", "trx", "TRON", 0.33, 31],
  ["cardano", "ada", "Cardano", 0.74, 27],
  ["chainlink", "link", "Chainlink", 20.5, 13.9],
  ["hyperliquid", "hype", "Hyperliquid", 42, 14.1],
  ["stellar", "xlm", "Stellar", 0.36, 11.5],
  ["sui", "sui", "Sui", 3.1, 11.0],
  ["bitcoin-cash", "bch", "Bitcoin Cash", 540, 10.7],
  ["hedera-hashgraph", "hbar", "Hedera", 0.21, 8.9],
  ["avalanche-2", "avax", "Avalanche", 26, 11.0],
  ["litecoin", "ltc", "Litecoin", 104, 7.9],
  ["the-open-network", "ton", "Toncoin", 2.6, 6.6],
  ["shiba-inu", "shib", "Shiba Inu", 0.0000115, 6.8],
  ["polkadot", "dot", "Polkadot", 3.6, 5.6],
  ["monero", "xmr", "Monero", 290, 5.4],
  ["uniswap", "uni", "Uniswap", 7.2, 4.5],
  ["dai", "dai", "Dai", 1, 5.3],
  ["aave", "aave", "Aave", 255, 3.9],
  ["pepe", "pepe", "Pepe", 0.0000088, 3.7],
  ["near", "near", "NEAR Protocol", 2.5, 3.1],
  ["ethereum-classic", "etc", "Ethereum Classic", 18, 2.8],
  ["aptos", "apt", "Aptos", 4.2, 2.9],
  ["internet-computer", "icp", "Internet Computer", 4.4, 2.4],
  ["ondo-finance", "ondo", "Ondo", 0.85, 2.7],
  ["mantle", "mnt", "Mantle", 1.6, 5.2],
  ["cronos", "cro", "Cronos", 0.16, 5.5],
  ["kaspa", "kas", "Kaspa", 0.068, 1.8],
  ["polygon-ecosystem-token", "pol", "POL (ex-MATIC)", 0.21, 2.2],
  ["arbitrum", "arb", "Arbitrum", 0.38, 2.0],
  ["vechain", "vet", "VeChain", 0.022, 1.9],
  ["algorand", "algo", "Algorand", 0.19, 1.6],
  ["render-token", "render", "Render", 3.0, 1.55],
  ["cosmos", "atom", "Cosmos Hub", 3.9, 1.8],
  ["filecoin", "fil", "Filecoin", 2.0, 1.4],
  ["bittensor", "tao", "Bittensor", 390, 3.8],
  ["official-trump", "trump", "Official Trump", 6.9, 1.4],
  ["optimism", "op", "Optimism", 0.55, 1.0],
  ["injective-protocol", "inj", "Injective", 11.5, 1.1],
  ["stacks", "stx", "Stacks", 0.55, 0.85],
  ["the-graph", "grt", "The Graph", 0.075, 0.8],
  ["immutable-x", "imx", "Immutable", 0.55, 1.05],
  ["sei-network", "sei", "Sei", 0.25, 1.5],
  ["fetch-ai", "fet", "Artificial Superintelligence Alliance", 0.55, 1.3],
  ["bonk", "bonk", "Bonk", 0.000019, 1.5],
  ["jupiter-exchange-solana", "jup", "Jupiter", 0.42, 1.3],
  ["worldcoin-wld", "wld", "Worldcoin", 1.25, 2.4],
  ["quant-network", "qnt", "Quant", 95, 1.15],
  ["maker", "mkr", "Maker", 1700, 1.5],
  ["theta-token", "theta", "Theta Network", 0.65, 0.65],
  ["the-sandbox", "sand", "The Sandbox", 0.26, 0.64],
  ["decentraland", "mana", "Decentraland", 0.28, 0.54],
  ["axie-infinity", "axs", "Axie Infinity", 2.2, 0.36],
  ["tezos", "xtz", "Tezos", 0.68, 0.71],
  ["eos", "eos", "EOS", 0.55, 0.85],
  ["flow", "flow", "Flow", 0.36, 0.57],
  ["gala", "gala", "GALA", 0.015, 0.67],
  ["iota", "iota", "IOTA", 0.18, 0.7],
  ["curve-dao-token", "crv", "Curve DAO", 0.75, 1.05],
  ["lido-dao", "ldo", "Lido DAO", 1.15, 1.03],
  ["ethena", "ena", "Ethena", 0.58, 3.9],
  ["pendle", "pendle", "Pendle", 4.6, 0.77],
  ["raydium", "ray", "Raydium", 2.9, 0.78],
  ["floki", "floki", "FLOKI", 0.000095, 0.91],
  ["dogwifcoin", "wif", "dogwifhat", 0.78, 0.78],
  ["helium", "hnt", "Helium", 2.9, 0.53],
  ["kucoin-shares", "kcs", "KuCoin", 14.5, 1.85],
  ["gatechain-token", "gt", "Gate", 17, 1.7],
  ["okb", "okb", "OKB", 190, 4.0],
  ["leo-token", "leo", "LEO Token", 9.5, 8.8],
  ["neo", "neo", "NEO", 6.6, 0.47],
  ["zcash", "zec", "Zcash", 72, 1.15],
  ["dash", "dash", "Dash", 26, 0.32],
  ["chiliz", "chz", "Chiliz", 0.04, 0.38],
  ["pancakeswap-token", "cake", "PancakeSwap", 2.6, 0.88],
  ["thorchain", "rune", "THORChain", 1.25, 0.43],
  ["conflux-token", "cfx", "Conflux", 0.15, 0.78],
  ["arweave", "ar", "Arweave", 6.5, 0.43],
  ["kaia", "kaia", "Kaia", 0.15, 0.88],
  ["jasmycoin", "jasmy", "JasmyCoin", 0.015, 0.74],
  ["starknet", "strk", "Starknet", 0.13, 0.5],
  ["ethereum-name-service", "ens", "Ethereum Name Service", 20, 0.74],
  ["compound-governance-token", "comp", "Compound", 42, 0.4],
  ["1inch", "1inch", "1inch", 0.25, 0.35],
  ["sky", "sky", "Sky", 0.068, 1.5],
  ["virtual-protocol", "virtual", "Virtuals Protocol", 1.1, 0.72],
  ["pyth-network", "pyth", "Pyth Network", 0.15, 0.86],
  ["celestia", "tia", "Celestia", 1.6, 1.2],
  ["gnosis", "gno", "Gnosis", 160, 0.42],
  ["mina-protocol", "mina", "Mina Protocol", 0.19, 0.24],
  ["synthetix-network-token", "snx", "Synthetix", 0.62, 0.21],
  ["xdce-crowd-sale", "xdc", "XDC Network", 0.075, 1.25],
  ["paypal-usd", "pyusd", "PayPal USD", 1, 1.3],
  ["first-digital-usd", "fdusd", "First Digital USD", 1, 1.4],
];

const STABLES = new Set(["usdt", "usdc", "dai", "pyusd", "fdusd"]);
const HOUR = 3600;

/** Small seeded PRNG (mulberry32) so demo data is stable between requests. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Random walk of `n` closes that ends exactly at `last`. */
function walk(id: string, n: number, last: number, vol: number, salt: number): number[] {
  const r = rng(hash(id) + salt);
  const out = new Array<number>(n);
  out[n - 1] = last;
  for (let i = n - 2; i >= 0; i--) {
    const drift = (r() - 0.5) * 2 * vol;
    out[i] = Math.max(out[i + 1] / (1 + drift), last * 0.05);
  }
  return out;
}

function volatility(symbol: string) {
  return STABLES.has(symbol) ? 0.0004 : symbol === "btc" ? 0.006 : symbol === "eth" ? 0.008 : 0.012;
}

const pct = (from: number, to: number) => (from ? ((to - from) / from) * 100 : null);

// Snap "now" to the hour so the series is stable within an hour.
const nowHour = () => Math.floor(Date.now() / 1000 / HOUR) * HOUR;

function buildMarkets(): CoinMarket[] {
  const salt = nowHour() / HOUR;
  return SEED.map(([id, symbol, name, price, capB], i) => {
    const vol = volatility(symbol);
    const hourly = walk(id, 24 * 30, price, vol, salt);
    const yearly = walk(id + ":y", 53, price, vol * 6, 0);
    const last24 = hourly.slice(-24);
    const supply = (capB * 1e9) / price;
    const r = rng(hash(id))();
    return {
      id,
      symbol,
      name,
      image: "",
      rank: i + 1,
      price,
      marketCap: capB * 1e9,
      volume24h: capB * 1e9 * (0.02 + r * 0.12),
      high24h: Math.max(...last24),
      low24h: Math.min(...last24),
      change1h: pct(hourly[hourly.length - 2], price),
      change24h: pct(hourly[hourly.length - 24], price),
      change7d: pct(hourly[hourly.length - 24 * 7], price),
      change30d: pct(hourly[0], price),
      change1y: pct(yearly[0], price),
      circulatingSupply: supply,
      totalSupply: symbol === "btc" ? supply : supply * (1 + r * 0.15),
      maxSupply: symbol === "btc" ? 21_000_000 : r > 0.6 ? supply * (1.2 + r) : null,
      ath: Math.max(...yearly) * (1 + r * 0.4),
      athChangePct: null,
      athDate: null,
      sparkline7d: hourly.slice(-24 * 7),
    } satisfies CoinMarket;
  })
    .map((c) => ({ ...c, athChangePct: c.ath ? ((c.price - c.ath) / c.ath) * 100 : null }))
    .sort((a, b) => b.marketCap - a.marketCap)
    .map((c, i) => ({ ...c, rank: i + 1 }));
}

function toHit(c: CoinMarket): SearchHit {
  return { id: c.id, name: c.name, symbol: c.symbol, thumb: c.image, rank: c.rank };
}

export const demoProvider: MarketProvider = {
  async getMarkets({ perPage, page, ids }) {
    const all = buildMarkets();
    if (ids?.length) return all.filter((c) => ids.includes(c.id));
    return all.slice((page - 1) * perPage, page * perPage);
  },

  async getGlobal(): Promise<GlobalStats> {
    const all = buildMarkets();
    const top = all.reduce((s, c) => s + c.marketCap, 0);
    const total = top * 1.12; // the long tail beyond the top 100
    const weighted24h = all.reduce((s, c) => s + (c.change24h ?? 0) * c.marketCap, 0) / top;
    const dominance: Record<string, number> = {};
    for (const c of all.slice(0, 10)) dominance[c.symbol] = (c.marketCap / total) * 100;
    return {
      totalMarketCap: total,
      totalVolume24h: all.reduce((s, c) => s + c.volume24h, 0) * 1.1,
      marketCapChange24h: weighted24h,
      activeCryptocurrencies: 17_800,
      markets: 1_340,
      dominance,
    };
  },

  async getCandles(id, days): Promise<CandleSeries> {
    const coin = buildMarkets().find((c) => c.id === id);
    if (!coin) throw new Error(`Unknown coin "${id}"`);
    // Same candle sizes CoinGecko uses for each range.
    const step = days <= 2 ? HOUR / 2 : days <= 30 ? 4 * HOUR : 4 * 24 * HOUR;
    const n = Math.ceil((days * 24 * HOUR) / step);
    const vol = volatility(coin.symbol) * Math.sqrt(step / HOUR);
    const closes = walk(id + ":" + days, n + 1, coin.price, vol, nowHour() / HOUR);
    const r = rng(hash(id) + days);
    const end = nowHour();
    const candles: Candle[] = [];
    const volumes = [];
    for (let i = 1; i <= n; i++) {
      const open = closes[i - 1];
      const close = closes[i];
      const wick = Math.abs(close - open) + open * vol * r();
      const time = end - (n - i) * step;
      candles.push({ time, open, close, high: Math.max(open, close) + wick * r(), low: Math.min(open, close) - wick * r() });
      volumes.push({ time, value: coin.volume24h * (step / (24 * HOUR)) * (0.5 + r()) });
    }
    return { candles, volumes };
  },

  async search(query) {
    const q = query.toLowerCase();
    return buildMarkets()
      .filter((c) => c.name.toLowerCase().includes(q) || c.symbol.includes(q) || c.id.includes(q))
      .slice(0, 12)
      .map(toHit);
  },

  async getTrending() {
    return buildMarkets()
      .filter((c) => !STABLES.has(c.symbol))
      .sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0))
      .slice(0, 7)
      .map(toHit);
  },
};
