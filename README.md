# LAMINAR

**Cryptocurrency markets dashboard and the foundation for a compliant real-world asset (RWA) tokenization platform.**

This repository contains **Stage 1**: a working, production-built crypto dashboard with real market data. Tokenization, the admin review portal and blockchain features are planned. See [docs/ROADMAP.md](docs/ROADMAP.md). Those sections appear in the navigation marked "Planned" and do not pretend to work.

## What works today (Stage 1)

| Area | Included |
| --- | --- |
| **Overview** | Total market cap, 24h volume, BTC/ETH dominance, market breadth, featured BTC/ETH/SOL/XRP/BNB cards, live BTC candlestick chart, top gainers and losers, dominance breakdown, trending coins, portfolio snapshot |
| **Cryptocurrency Markets** | Top 100 by market cap: price, 1h/24h/7d change, volume, market cap, circulating supply, 7-day sparkline. Sortable columns, filtering, gainer/loser views and aggregate analytics |
| **Advanced Charts** | TradingView Lightweight Charts candlesticks with volume for any coin, 1D / 7D / 30D / 90D / 1Y ranges, period high/low/return, full market stats and historical performance (1h to 1y) |
| **Search** | Searches every coin CoinGecko lists, not just the top 100. Press `/` anywhere to focus |
| **Watchlist** | Star any asset; works for coins outside the top 100 |
| **My Portfolio** | Record purchases (quantity, price, date). Shows live value, 24h change, cost basis, unrealized P/L per asset and in total, allocation and purchase history. Export/import backups in Settings |
| **Responsive UI** | Desktop sidebar layout, mobile drawer navigation, dark "financial terminal" theme |
| **Resilience** | Server-side caching, rate-limit handling, and an automatic, clearly labeled fallback to demo data if CoinGecko is unreachable |

**Current limitations, stated plainly:**
- There are no user accounts yet. Watchlists and portfolios are stored in the browser (`localStorage`), so they don't sync across devices. Use Settings → Export backup to move them. Accounts and server-side storage arrive in Stage 2 (the PostgreSQL schema is already in `db/schema.sql`).
- Prices refresh every 60 seconds by polling (CoinGecko's free tier doesn't offer websockets).
- CoinGecko decides candle size from the range: 30-minute candles for 1D, 4-hour for 7D/30D, 4-day for 90D/1Y.
- The portfolio's asset picker lists the top 100 coins.

## Quick start (local)

Requires **Node.js 20.9+** (22 recommended).

```bash
git clone https://github.com/TeqnikalStudios/laminar.git
cd laminar
cp .env.example .env.local     # optional: add a CoinGecko API key
npm install
npm run dev                    # http://localhost:3000
```

No network or API key? Run with sample data:

```bash
MARKET_DATA_MODE=demo npm run dev
```

## Run with Docker

```bash
cp .env.example .env           # set COINGECKO_API_KEY if you have one
docker compose up --build -d   # http://localhost:3000
```

With PostgreSQL as well (not used by Stage 1, but it loads the Stage 2 schema):

```bash
docker compose --profile db up --build -d
```

Health check: `GET /api/health`.

## Deploy to a server

Any host that runs Docker works (a VPS, AWS ECS/Lightsail, Google Cloud Run, Fly.io, Render, Railway):

```bash
docker build -t laminar-web .
docker run -d -p 3000:3000 --env-file .env --restart unless-stopped laminar-web
```

Put it behind HTTPS (Caddy, Nginx, or your platform's load balancer). It also deploys to Vercel with no changes: import the repo and set the environment variables.

## Configuration

All variables are read on the server only. See [.env.example](.env.example).

| Variable | Default | Purpose |
| --- | --- | --- |
| `MARKET_DATA_MODE` | `live` | `live` uses CoinGecko; `demo` uses bundled sample data |
| `COINGECKO_API_KEY` | empty | Optional. A free Demo key raises rate limits ([get one](https://www.coingecko.com/en/api)) |
| `COINGECKO_API_PLAN` | `demo` | `demo` for free keys, `pro` for paid keys |
| `MARKET_CACHE_SECONDS` | `60` | Server cache for upstream responses |
| `DATABASE_URL`, `POSTGRES_*` | | For the Stage 2 database |

**Secrets:** the CoinGecko key is attached by the server's API routes and never sent to the browser. `.env` files are git-ignored. Never prefix a secret with `NEXT_PUBLIC_`.

## Architecture

```
laminar/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── page.tsx                # Overview
│   │   ├── markets/                # Top 100 table
│   │   ├── charts/[id]/            # Advanced candlestick charts
│   │   ├── portfolio/  watchlist/  settings/
│   │   ├── tokenization/  tokenized-assets/  wallet/  notifications/   # planned (Stage 2-4)
│   │   └── api/
│   │       ├── health/             # liveness probe
│   │       └── market/             # markets, global, candles/[id], search, trending
│   ├── modules/                    # domain modules, developed independently
│   │   ├── market/
│   │   │   ├── types.ts            # LAMINAR's own data shapes
│   │   │   ├── server/             # provider interface, CoinGecko + demo providers
│   │   │   └── client/             # data hooks, polling, live/demo state
│   │   └── portfolio/store.ts      # watchlist + portfolio (browser now, API in Stage 2)
│   ├── components/                 # shell, market widgets, UI primitives
│   ├── views/                      # page-level client views
│   └── lib/format.ts               # number/currency formatting
├── db/schema.sql                   # PostgreSQL schema for Stages 2-3
├── docs/ROADMAP.md                 # tokenization integration plan
├── Dockerfile  docker-compose.yml  .env.example
└── .github/workflows/ci.yml        # build + typecheck on every push/PR
```

**Data flow:** browser → `/api/market/*` (validated inputs, cached, holds the API key) → `MarketProvider` (CoinGecko or demo) → mapped into LAMINAR types → UI. Adding another source (an exchange API, for example) means implementing `MarketProvider` in `src/modules/market/server/`.

### API

| Route | Description |
| --- | --- |
| `GET /api/market/markets?perPage=100&page=1` | Coins by market cap (`ids=bitcoin,ethereum` for specific coins) |
| `GET /api/market/global` | Total market cap, volume, dominance |
| `GET /api/market/candles/{id}?days=1\|7\|30\|90\|365` | OHLC candles and volume |
| `GET /api/market/search?q=sol` | Coin search |
| `GET /api/market/trending` | Trending coins |

Every response is `{ data, source: "live" | "demo" | "demo-fallback", updatedAt, notice? }`.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · TradingView Lightweight Charts 5 · lucide-react · CoinGecko API · Docker · PostgreSQL (Stage 2)

## Scripts

| Command | |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (also type-checks) |
| `npm start` | Serve the production build |
| `npm run typecheck` | TypeScript only |

---

Market data provided by [CoinGecko](https://www.coingecko.com). Charts by [TradingView Lightweight Charts](https://www.tradingview.com/lightweight-charts/). LAMINAR does not provide financial advice.
