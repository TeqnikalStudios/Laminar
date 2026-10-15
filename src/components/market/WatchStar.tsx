"use client";

import { Star } from "lucide-react";
import { useWatchlist } from "@/modules/portfolio/store";

export function WatchStar({ coinId, name }: { coinId: string; name: string }) {
  const { has, toggle } = useWatchlist();
  const on = has(coinId);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(coinId);
      }}
      aria-pressed={on}
      aria-label={on ? `Remove ${name} from watchlist` : `Add ${name} to watchlist`}
      className={`rounded-md p-1 transition-colors ${on ? "text-warn" : "text-faint hover:text-ink"}`}
    >
      <Star size={15} fill={on ? "currentColor" : "none"} />
    </button>
  );
}
