"use client";

import { ArrowRight, Flame, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CandleChart } from "@/components/market/CandleChart";
import { CoinIcon } from "@/components/market/CoinIcon";
import { MarketFloor } from "@/components/market/MarketFloor";
import { MarketTable } from "@/components/market/MarketTable";
import { Sparkline } from "@/components/market/Sparkline";
import { tiltProps } from "@/components/ui/Tilt";
import { Change, ErrorNote, PageHeader, Panel, PanelHeader, Segmented, Skeleton } from "@/components/ui/primitives";
import { formatCompactUsd, formatPct, formatUsd } from "@/lib/format";
import { useCandles, useCoins, useGlobal, useMarkets, useTrending } from "@/modules/market/client/useApi";
import type { CoinMarket } from "@/modules/market/types";
import { buildPositions, usePortfolio } from "@/modules/portfolio/store";

const FEATURED = ["bitcoin", "ethereum", "solana", "ripple", "binancecoin"];
const STABLE = new Set(["usdt", "usdc", "dai", "fdusd", "pyusd", "usde", "usds", "tusd", "busd"]);

export function OverviewView() {
  const markets = useMarkets(100);
  const global = useGlobal();
  const coins = markets.data;

  const featured = useMemo(() => FEATURED.map((id) => coins?.find((c) => c.id === id)).filter(Boolean) as CoinMarket[], [coins]);

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Market command center"
        description="Live prices, market structure and momentum across the top 100 digital assets."
      />

      {markets.error && !coins && <ErrorNote message={markets.error} onRetry={markets.refresh} />}

      <GlobalStrip coins={coins} global={global.data} />

      <div className="mt-5">
        <MarketFloor coins={coins} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {featured.length
          ? featured.map((c, i) => <FeaturedCard key={c.id} coin={c} delay={i * 60} />)
          : FEATURED.map((id) => <Skeleton key={id} className="h-[132px] rounded-2xl" />)}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <BtcChartPanel coin={coins?.find((c) => c.id === "bitcoin")} />
        <MoversPanel coins={coins} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <DominancePanel dominance={global.data?.dominance} />
        <TrendingPanel />
        <PortfolioSnapshot />
      </div>

      <Panel className="mt-5 overflow-hidden">
        <PanelHeader
          title="Top assets by market cap"
          right={
            <Link href="/markets" className="inline-flex items-center gap-1 text-xs text-flow hover:underline">
              All 100 <ArrowRight size={13} />
            </Link>
          }
        />
        <MarketTable coins={coins?.slice(0, 10)} loading={markets.loading} />
      </Panel>
    </>
  );
}

function GlobalStrip({ coins, global }: { coins: CoinMarket[] | undefined; global: ReturnType<typeof useGlobal>["data"] }) {
  const breadth = useMemo(() => {
    if (!coins) return null;
    const up = coins.filter((c) => (c.change24h ?? 0) > 0).length;
    return { up, down: coins.length - up, total: coins.length };
  }, [coins]);

  const stats = [
    { label: "Total market cap", value: formatCompactUsd(global?.totalMarketCap), sub: <Change value={global?.marketCapChange24h} className="text-xs" /> },
    { label: "24h volume", value: formatCompactUsd(global?.totalVolume24h), sub: <span className="text-xs text-faint">all exchanges</span> },
    { label: "BTC dominance", value: global ? `${global.dominance.btc?.toFixed(1)}%` : "—", sub: <span className="text-xs text-faint">ETH {global ? `${global.dominance.eth?.toFixed(1)}%` : "—"}</span> },
    {
      label: "Market breadth (24h)",
      value: breadth ? `${breadth.up} / ${breadth.down}` : "—",
      sub: breadth ? (
        <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-down/60">
          <div className="bg-up" style={{ width: `${(breadth.up / breadth.total) * 100}%` }} />
        </div>
      ) : null,
      hint: "Advancing vs declining assets in the top 100",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s, i) => (
        <Panel key={s.label} glow={i === 0} className="tilt animate-rise px-5 py-4" {...tiltProps({ animationDelay: `${i * 50}ms` })}>
          <p className="text-[11px] tracking-wide text-muted uppercase" title={s.hint}>
            {s.label}
          </p>
          {global || coins ? <p className="num mt-1.5 text-xl font-semibold sm:text-2xl">{s.value}</p> : <Skeleton className="mt-2 h-7 w-28" />}
          <div className="mt-1">{s.sub}</div>
        </Panel>
      ))}
    </div>
  );
}

function FeaturedCard({ coin, delay }: { coin: CoinMarket; delay: number }) {
  return (
    <Link href={`/charts/${coin.id}`} className="panel tilt group animate-rise block overflow-hidden p-4" {...tiltProps({ animationDelay: `${delay}ms` })}>
      <div className="flex items-center gap-2.5">
        <CoinIcon src={coin.image} symbol={coin.symbol} size={26} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium group-hover:text-flow">{coin.name}</p>
          <p className="text-[11px] text-faint uppercase">{coin.symbol}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <p className="num text-lg font-semibold">{formatUsd(coin.price)}</p>
        <Change value={coin.change24h} badge />
      </div>
      <div className="-mx-1 mt-1">
        <Sparkline data={coin.sparkline7d} width={220} height={36} />
      </div>
    </Link>
  );
}

function BtcChartPanel({ coin }: { coin: CoinMarket | undefined }) {
  const candles = useCandles("bitcoin", 7);
  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        title="Bitcoin · 7 days"
        subtitle={coin ? <span className="num">{formatUsd(coin.price)} · <Change value={coin.change7d} /> this week</span> : "4-hour candles"}
        right={
          <Link href="/charts/bitcoin" className="inline-flex items-center gap-1 text-xs text-flow hover:underline">
            Advanced chart <ArrowRight size={13} />
          </Link>
        }
      />
      <div className="px-2 pb-2">
        {candles.error && !candles.data ? <div className="p-4"><ErrorNote message={candles.error} onRetry={candles.refresh} /></div> : <CandleChart series={candles.data} className="h-[300px] sm:h-[340px]" />}
      </div>
    </Panel>
  );
}

function MoversPanel({ coins }: { coins: CoinMarket[] | undefined }) {
  const [tab, setTab] = useState<"Gainers" | "Losers">("Gainers");
  const list = useMemo(() => {
    if (!coins) return undefined;
    const ranked = coins.filter((c) => c.change24h != null && !STABLE.has(c.symbol));
    ranked.sort((a, b) => (tab === "Gainers" ? b.change24h! - a.change24h! : a.change24h! - b.change24h!));
    return ranked.slice(0, 7);
  }, [coins, tab]);

  return (
    <Panel>
      <PanelHeader
        title="Top movers"
        subtitle="24h change, top 100"
        right={<Segmented label="Movers" options={["Gainers", "Losers"] as const} value={tab} onChange={setTab} />}
      />
      <ul className="px-2 pb-3">
        {!list && Array.from({ length: 7 }, (_, i) => <li key={i} className="px-3 py-2"><Skeleton className="h-8" /></li>)}
        {list?.map((c) => (
          <li key={c.id}>
            <Link href={`/charts/${c.id}`} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/[0.03]">
              <CoinIcon src={c.image} symbol={c.symbol} size={24} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{c.name}</p>
                <p className="num text-xs text-faint">{formatUsd(c.price)}</p>
              </div>
              {tab === "Gainers" ? <TrendingUp size={14} className="text-up" /> : <TrendingDown size={14} className="text-down" />}
              <Change value={c.change24h} badge className="w-[72px] justify-end" />
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

const DOM_COLORS = ["#22d3ee", "#8b5cf6", "#19d9a0", "#f5b84b", "#ff5c7c", "#60a5fa"];

function DominancePanel({ dominance }: { dominance: Record<string, number> | undefined }) {
  const slices = useMemo(() => {
    if (!dominance) return undefined;
    const top = Object.entries(dominance).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const other = Math.max(0, 100 - top.reduce((s, [, v]) => s + v, 0));
    return [...top.map(([k, v], i) => ({ label: k.toUpperCase(), value: v, color: DOM_COLORS[i] })), { label: "Other", value: other, color: "#3a4263" }];
  }, [dominance]);

  return (
    <Panel>
      <PanelHeader title="Market dominance" subtitle="Share of total crypto market cap" />
      <div className="px-5 pb-5">
        {!slices ? (
          <Skeleton className="h-24" />
        ) : (
          <>
            <div className="flex h-3 overflow-hidden rounded-full">
              {slices.map((s) => (
                <div key={s.label} style={{ width: `${s.value}%`, background: s.color }} title={`${s.label} ${s.value.toFixed(1)}%`} />
              ))}
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {slices.map((s) => (
                <li key={s.label} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
                  <span className="flex-1 text-muted">{s.label}</span>
                  <span className="num">{s.value.toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Panel>
  );
}

function TrendingPanel() {
  const trending = useTrending();
  return (
    <Panel>
      <PanelHeader title="Trending searches" subtitle="Most searched on CoinGecko in the last 24h" right={<Flame size={16} className="text-warn" />} />
      <ul className="px-2 pb-3">
        {!trending.data && Array.from({ length: 6 }, (_, i) => <li key={i} className="px-3 py-2"><Skeleton className="h-6" /></li>)}
        {trending.data?.slice(0, 7).map((c, i) => (
          <li key={c.id}>
            <Link href={`/charts/${c.id}`} className="flex items-center gap-3 rounded-lg px-3 py-1.5 hover:bg-white/[0.03]">
              <span className="num w-4 text-xs text-faint">{i + 1}</span>
              <CoinIcon src={c.thumb} symbol={c.symbol} size={22} />
              <span className="flex-1 truncate text-sm">{c.name}</span>
              <span className="text-xs text-faint uppercase">{c.symbol}</span>
              {c.rank && <span className="num w-10 text-right text-xs text-muted">#{c.rank}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function PortfolioSnapshot() {
  const { lots } = usePortfolio();
  const { data: coins } = useCoins(lots.map((l) => l.coinId));
  const prices = useMemo(() => Object.fromEntries((coins ?? []).map((c) => [c.id, c.price])), [coins]);
  const positions = buildPositions(lots, prices);
  const value = positions.reduce((s, p) => s + p.value, 0);
  const cost = positions.filter((p) => p.priced).reduce((s, p) => s + p.costBasis, 0);
  const pnl = value - cost;

  return (
    <Panel glow>
      <PanelHeader
        title="My portfolio"
        right={
          <Link href="/portfolio" className="inline-flex items-center gap-1 text-xs text-flow hover:underline">
            Manage <ArrowRight size={13} />
          </Link>
        }
      />
      <div className="px-5 pb-5">
        {lots.length === 0 ? (
          <div className="py-4">
            <p className="text-sm text-muted">Track holdings, cost basis and profit/loss in real time.</p>
            <Link href="/portfolio" className="mt-4 inline-flex rounded-lg bg-gradient-to-r from-flow to-flow-2 px-4 py-2 text-sm font-medium text-void">
              Add your first holding
            </Link>
          </div>
        ) : (
          <>
            <p className="num text-3xl font-semibold">{formatUsd(value)}</p>
            <p className={`num mt-1 text-sm ${pnl >= 0 ? "text-up" : "text-down"}`}>
              {pnl >= 0 ? "+" : ""}
              {formatUsd(pnl)} ({formatPct(cost ? (pnl / cost) * 100 : 0)}) all time
            </p>
            <ul className="mt-4 space-y-2">
              {positions.slice(0, 4).map((p) => {
                const coin = coins?.find((c) => c.id === p.coinId);
                return (
                  <li key={p.coinId} className="flex items-center gap-2 text-sm">
                    <CoinIcon src={coin?.image} symbol={coin?.symbol ?? p.coinId} size={20} />
                    <span className="flex-1 truncate text-muted">{coin?.name ?? p.coinId}</span>
                    <span className="num">{p.priced ? formatUsd(p.value) : "—"}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </Panel>
  );
}
