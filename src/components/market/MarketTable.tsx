"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { CoinMarket } from "@/modules/market/types";
import { formatCompact, formatCompactUsd, formatUsd } from "@/lib/format";
import { Change, Skeleton } from "@/components/ui/primitives";
import { CoinIcon } from "./CoinIcon";
import { Sparkline } from "./Sparkline";
import { WatchStar } from "./WatchStar";

export type SortKey = "rank" | "name" | "price" | "change1h" | "change24h" | "change7d" | "volume24h" | "marketCap" | "circulatingSupply";

const COLUMNS: { key: SortKey; label: string; className: string }[] = [
  { key: "rank", label: "#", className: "w-12 text-left" },
  { key: "name", label: "Asset", className: "text-left" },
  { key: "price", label: "Price", className: "text-right" },
  { key: "change1h", label: "1h", className: "text-right hidden xl:table-cell" },
  { key: "change24h", label: "24h", className: "text-right" },
  { key: "change7d", label: "7d", className: "text-right hidden md:table-cell" },
  { key: "volume24h", label: "Volume (24h)", className: "text-right hidden lg:table-cell" },
  { key: "marketCap", label: "Market cap", className: "text-right hidden sm:table-cell" },
  { key: "circulatingSupply", label: "Circulating supply", className: "text-right hidden 2xl:table-cell" },
];

export function MarketTable({
  coins,
  loading,
  emptyText = "No assets",
  defaultSort = { key: "rank", dir: 1 },
}: {
  coins: CoinMarket[] | undefined;
  loading?: boolean;
  emptyText?: string;
  defaultSort?: { key: SortKey; dir: 1 | -1 };
}) {
  const router = useRouter();
  const [sort, setSort] = useState(defaultSort);

  const rows = useMemo(() => {
    if (!coins) return [];
    const { key, dir } = sort;
    return [...coins].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
      // Nulls always sort last.
      if (av == null) return 1;
      if (bv == null) return -1;
      return ((av as number) - (bv as number)) * dir;
    });
  }, [coins, sort]);

  const toggle = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "rank" || key === "name" ? 1 : -1 }));

  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full min-w-[360px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-[11px] tracking-wide text-faint uppercase">
            <th className="w-8 py-3 pl-4" aria-label="Watchlist" />
            {COLUMNS.map((c) => (
              <th key={c.key} className={`px-3 py-3 font-medium ${c.className}`} aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
                <button onClick={() => toggle(c.key)} className="inline-flex items-center gap-1 hover:text-ink">
                  {c.label}
                  {sort.key === c.key && (sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                </button>
              </th>
            ))}
            <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">Last 7 days</th>
          </tr>
        </thead>
        <tbody>
          {loading &&
            !coins &&
            Array.from({ length: 12 }, (_, i) => (
              <tr key={i} className="border-b border-line/60">
                <td colSpan={11} className="px-4 py-3.5">
                  <Skeleton className="h-5 w-full" />
                </td>
              </tr>
            ))}
          {!loading && coins && rows.length === 0 && (
            <tr>
              <td colSpan={11} className="px-4 py-12 text-center text-sm text-muted">
                {emptyText}
              </td>
            </tr>
          )}
          {rows.map((c) => (
            <tr
              key={c.id}
              onClick={() => router.push(`/charts/${c.id}`)}
              className="group cursor-pointer border-b border-line/60 transition-colors hover:bg-white/[0.025]"
            >
              <td className="py-3 pl-4">
                <WatchStar coinId={c.id} name={c.name} />
              </td>
              <td className="num px-3 py-3 text-faint">{c.rank ?? "—"}</td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-3">
                  <CoinIcon src={c.image} symbol={c.symbol} size={26} />
                  <div className="min-w-0">
                    <div className="truncate font-medium text-ink group-hover:text-flow">{c.name}</div>
                    <div className="text-xs text-faint uppercase">{c.symbol}</div>
                  </div>
                </div>
              </td>
              <td className="num px-3 py-3 text-right font-medium">{formatUsd(c.price)}</td>
              <td className="hidden px-3 py-3 text-right xl:table-cell">
                <Change value={c.change1h} />
              </td>
              <td className="px-3 py-3 text-right">
                <Change value={c.change24h} />
              </td>
              <td className="hidden px-3 py-3 text-right md:table-cell">
                <Change value={c.change7d} />
              </td>
              <td className="num hidden px-3 py-3 text-right text-muted lg:table-cell">{formatCompactUsd(c.volume24h)}</td>
              <td className="num hidden px-3 py-3 text-right sm:table-cell">{formatCompactUsd(c.marketCap)}</td>
              <td className="num hidden px-3 py-3 text-right text-muted 2xl:table-cell">
                {formatCompact(c.circulatingSupply)} <span className="text-faint uppercase">{c.symbol}</span>
              </td>
              <td className="hidden px-4 py-2 text-right lg:table-cell">
                <div className="inline-block">
                  <Sparkline data={c.sparkline7d} width={120} height={34} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
