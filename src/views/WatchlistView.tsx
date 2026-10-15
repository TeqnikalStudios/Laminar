"use client";

import { Star } from "lucide-react";
import { MarketTable } from "@/components/market/MarketTable";
import { EmptyState, PageHeader, Panel } from "@/components/ui/primitives";
import { useCoins } from "@/modules/market/client/useApi";
import { useWatchlist } from "@/modules/portfolio/store";

export function WatchlistView() {
  const { ids } = useWatchlist();
  const { data, loading } = useCoins(ids);
  // Keep rows for coins just un-starred out of view immediately.
  const rows = data?.filter((c) => ids.includes(c.id));

  return (
    <>
      <PageHeader eyebrow="Watchlist" title="Assets you're watching" description="Star any asset in Markets, Charts or search results to add it here. Includes coins outside the top 100." />
      <Panel className="overflow-hidden">
        {ids.length === 0 ? (
          <EmptyState icon={<Star size={28} />} title="Your watchlist is empty">
            Tap the star next to any asset to follow it here.
          </EmptyState>
        ) : (
          <MarketTable coins={rows} loading={loading} />
        )}
      </Panel>
    </>
  );
}
