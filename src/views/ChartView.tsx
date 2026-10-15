"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CandleChart } from "@/components/market/CandleChart";
import { CoinIcon } from "@/components/market/CoinIcon";
import { WatchStar } from "@/components/market/WatchStar";
import { Change, ErrorNote, Panel, PanelHeader, Segmented, Skeleton } from "@/components/ui/primitives";
import { formatCompact, formatCompactUsd, formatUsd } from "@/lib/format";
import { useCandles, useCoins } from "@/modules/market/client/useApi";
import { CHART_RANGES, type ChartRangeKey } from "@/modules/market/types";

const QUICK = [
  ["bitcoin", "BTC"],
  ["ethereum", "ETH"],
  ["solana", "SOL"],
  ["ripple", "XRP"],
  ["binancecoin", "BNB"],
  ["dogecoin", "DOGE"],
  ["cardano", "ADA"],
] as const;

export function ChartView({ id }: { id: string }) {
  const [rangeKey, setRangeKey] = useState<ChartRangeKey>("7D");
  const range = CHART_RANGES.find((r) => r.key === rangeKey)!;
  const coinRes = useCoins([id]);
  const coin = coinRes.data?.[0];
  const candles = useCandles(id, range.days);

  const rangeStats = useMemo(() => {
    const k = candles.data?.candles;
    if (!k?.length) return null;
    const open = k[0].open;
    const close = k[k.length - 1].close;
    return {
      change: ((close - open) / open) * 100,
      high: Math.max(...k.map((c) => c.high)),
      low: Math.min(...k.map((c) => c.low)),
      volume: candles.data!.volumes.at(-1)?.value ?? null,
    };
  }, [candles.data]);

  const notFound = coinRes.data && coinRes.data.length === 0;

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-2">
        {QUICK.map(([qid, sym]) => (
          <Link
            key={qid}
            href={`/charts/${qid}`}
            className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${qid === id ? "border-flow/40 bg-flow/10 text-flow" : "border-line text-muted hover:text-ink"}`}
          >
            {sym}
          </Link>
        ))}
      </div>

      {notFound && <ErrorNote message={`No market data for "${id}". Try the search bar to find the asset.`} />}

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 animate-rise">
        <div className="flex items-center gap-3">
          {coin ? <CoinIcon src={coin.image} symbol={coin.symbol} size={40} /> : <Skeleton className="h-10 w-10 rounded-full" />}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold sm:text-2xl">{coin?.name ?? id}</h1>
              {coin && <span className="rounded bg-white/5 px-1.5 py-0.5 text-xs text-muted uppercase">{coin.symbol}</span>}
              {coin?.rank && <span className="text-xs text-faint">Rank #{coin.rank}</span>}
              {coin && <WatchStar coinId={coin.id} name={coin.name} />}
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="num text-2xl font-semibold sm:text-3xl">{coin ? formatUsd(coin.price) : "—"}</span>
              {coin && <Change value={coin.change24h} badge />}
              <span className="text-xs text-faint">24h</span>
            </div>
          </div>
        </div>
        <Segmented label="Chart range" options={CHART_RANGES.map((r) => r.key)} value={rangeKey} onChange={setRangeKey} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel glow className="overflow-hidden">
          <PanelHeader
            title={`${coin?.symbol.toUpperCase() ?? ""}/USD · ${range.label}`}
            subtitle={`${range.candle} candles · volume below`}
            right={
              rangeStats && (
                <div className="num flex flex-wrap gap-4 text-xs">
                  <span className="text-muted">
                    Range <Change value={rangeStats.change} />
                  </span>
                  <span className="text-muted">
                    H <span className="text-ink">{formatUsd(rangeStats.high)}</span>
                  </span>
                  <span className="text-muted">
                    L <span className="text-ink">{formatUsd(rangeStats.low)}</span>
                  </span>
                </div>
              )
            }
          />
          <div className="relative px-2 pb-2">
            {candles.error && !candles.data ? (
              <div className="p-4">
                <ErrorNote message={candles.error} onRetry={candles.refresh} />
              </div>
            ) : (
              <>
                <CandleChart series={candles.data} className="h-[380px] sm:h-[520px]" />
                {candles.loading && !candles.data && <div className="absolute inset-0 m-4 skeleton" />}
              </>
            )}
          </div>
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel>
            <PanelHeader title="Market statistics" />
            <dl className="px-5 pb-4 text-sm">
              {[
                ["Market cap", formatCompactUsd(coin?.marketCap)],
                ["Volume (24h)", formatCompactUsd(coin?.volume24h)],
                ["Volume / market cap", coin && coin.marketCap ? `${((coin.volume24h / coin.marketCap) * 100).toFixed(2)}%` : "—"],
                ["24h high", formatUsd(coin?.high24h)],
                ["24h low", formatUsd(coin?.low24h)],
                ["Circulating supply", coin ? `${formatCompact(coin.circulatingSupply)} ${coin.symbol.toUpperCase()}` : "—"],
                ["Total supply", formatCompact(coin?.totalSupply)],
                ["Max supply", coin?.maxSupply ? formatCompact(coin.maxSupply) : "∞"],
                ["All-time high", formatUsd(coin?.ath)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-line/60 py-2.5 last:border-0">
                  <dt className="text-muted">{k}</dt>
                  <dd className="num">{v}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-muted">From ATH</dt>
                <dd>
                  <Change value={coin?.athChangePct} />
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel>
            <PanelHeader title="Historical performance" />
            <div className="space-y-3 px-5 pb-5">
              {(
                [
                  ["1 hour", coin?.change1h],
                  ["24 hours", coin?.change24h],
                  ["7 days", coin?.change7d],
                  ["30 days", coin?.change30d],
                  ["1 year", coin?.change1y],
                ] as const
              ).map(([label, v]) => (
                <PerfBar key={label} label={label} value={v ?? null} />
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function PerfBar({ label, value }: { label: string; value: number | null }) {
  // Bars scale against ±100% so small and large moves both stay readable.
  const width = value == null ? 0 : Math.min(100, Math.sqrt(Math.abs(value)) * 10);
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-16 shrink-0 text-muted">{label}</span>
      <div className="relative h-2 flex-1 rounded-full bg-white/5">
        <div className="absolute inset-y-0 left-1/2 w-px bg-line-strong" />
        {value != null && (
          <div
            className={`absolute inset-y-0 rounded-full ${value >= 0 ? "left-1/2 bg-up" : "right-1/2 bg-down"}`}
            style={{ width: `${width / 2}%` }}
          />
        )}
      </div>
      <Change value={value} className="w-[68px] text-right text-xs" />
    </div>
  );
}
