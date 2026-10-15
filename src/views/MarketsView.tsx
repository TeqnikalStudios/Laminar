"use client";

import { Filter } from "lucide-react";
import { useMemo, useState } from "react";
import { MarketTable } from "@/components/market/MarketTable";
import { Change, ErrorNote, PageHeader, Panel, Segmented } from "@/components/ui/primitives";
import { formatCompactUsd } from "@/lib/format";
import { useMarkets } from "@/modules/market/client/useApi";

const VIEWS = ["All", "Gainers", "Losers", "No stablecoins"] as const;
type View = (typeof VIEWS)[number];
const STABLE = new Set(["usdt", "usdc", "dai", "fdusd", "pyusd", "usde", "usds", "tusd"]);

export function MarketsView() {
  const { data, loading, error, refresh } = useMarkets(100);
  const [filter, setFilter] = useState("");
  const [view, setView] = useState<View>("All");

  const rows = useMemo(() => {
    if (!data) return undefined;
    const q = filter.trim().toLowerCase();
    let list = q ? data.filter((c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)) : data;
    if (view === "Gainers") list = list.filter((c) => (c.change24h ?? 0) > 0).sort((a, b) => b.change24h! - a.change24h!).slice(0, 25);
    if (view === "Losers") list = list.filter((c) => (c.change24h ?? 0) < 0).sort((a, b) => a.change24h! - b.change24h!).slice(0, 25);
    if (view === "No stablecoins") list = list.filter((c) => !STABLE.has(c.symbol));
    return list;
  }, [data, filter, view]);

  const analytics = useMemo(() => {
    if (!data) return null;
    const cap = data.reduce((s, c) => s + c.marketCap, 0);
    const vol = data.reduce((s, c) => s + c.volume24h, 0);
    const w24 = data.reduce((s, c) => s + (c.change24h ?? 0) * c.marketCap, 0) / cap;
    const w7 = data.reduce((s, c) => s + (c.change7d ?? 0) * c.marketCap, 0) / cap;
    const nearAth = data.filter((c) => (c.athChangePct ?? -100) > -10).length;
    return { cap, vol, w24, w7, nearAth, turnover: (vol / cap) * 100 };
  }, [data]);

  return (
    <>
      <PageHeader eyebrow="Cryptocurrency Markets" title="Top 100 by market cap" description="Sort any column, filter by name or symbol, star assets to add them to your watchlist." />

      {analytics && (
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            ["Top 100 market cap", formatCompactUsd(analytics.cap)],
            ["Top 100 volume (24h)", formatCompactUsd(analytics.vol)],
            ["Cap-weighted 24h", <Change key="a" value={analytics.w24} />],
            ["Cap-weighted 7d", <Change key="b" value={analytics.w7} />],
            ["Volume / market cap", `${analytics.turnover.toFixed(2)}%`],
            ["Within 10% of ATH", `${analytics.nearAth} assets`],
          ].map(([label, value]) => (
            <Panel key={label as string} className="px-4 py-3">
              <p className="text-[11px] text-muted">{label}</p>
              <p className="num mt-1 text-[16px] font-semibold">{value}</p>
            </Panel>
          ))}
        </div>
      )}

      {error && !data && <ErrorNote message={error} onRetry={refresh} />}

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Filter size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter top 100"
              aria-label="Filter assets"
              className="h-8 w-full rounded-lg border border-line bg-void/60 pr-3 pl-8 text-sm placeholder:text-faint focus:border-flow/50 focus:outline-none"
            />
          </div>
          <Segmented label="View" options={VIEWS} value={view} onChange={setView} />
        </div>
        <MarketTable
          key={view}
          coins={rows}
          loading={loading}
          emptyText="No assets match that filter."
          defaultSort={view === "Gainers" ? { key: "change24h", dir: -1 } : view === "Losers" ? { key: "change24h", dir: 1 } : undefined}
        />
      </Panel>
    </>
  );
}
