"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ApiEnvelope, SearchHit } from "@/modules/market/types";
import { CoinIcon } from "./CoinIcon";

/** Global coin search. Covers every coin CoinGecko lists, not only the top 100. Press "/" to focus. */
export function CoinSearch() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/market/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json() as Promise<ApiEnvelope<SearchHit[]>>)
        .then((env) => {
          setHits(env.data ?? []);
          setActive(0);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = (hit: SearchHit) => {
    setOpen(false);
    setQ("");
    input.current?.blur();
    router.push(`/charts/${hit.id}`);
  };

  return (
    <div className="relative w-full max-w-md">
      <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
      <input
        ref={input}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, hits.length - 1));
          else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
          else if (e.key === "Enter" && hits[active]) go(hits[active]);
          else if (e.key === "Escape") input.current?.blur();
          else return;
          e.preventDefault();
        }}
        placeholder="Search any cryptocurrency"
        aria-label="Search cryptocurrencies"
        role="combobox"
        aria-expanded={open && hits.length > 0}
        aria-controls="coin-search-results"
        className="h-9 w-full rounded-lg border border-line bg-void/70 pr-10 pl-9 text-sm text-ink placeholder:text-faint focus:border-flow/50 focus:outline-none"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border border-line px-1.5 text-[10px] text-faint sm:block">/</kbd>

      {open && q.trim() && (
        <ul id="coin-search-results" role="listbox" className="panel scroll-thin absolute top-11 right-0 left-0 z-50 max-h-80 overflow-auto p-1.5 shadow-2xl shadow-black/60">
          {hits.length === 0 && <li className="px-3 py-3 text-sm text-muted">{loading ? "Searching…" : "No matches"}</li>}
          {hits.map((h, i) => (
            <li key={h.id} role="option" aria-selected={i === active}>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(h)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${i === active ? "bg-white/5" : ""}`}
              >
                <CoinIcon src={h.thumb} symbol={h.symbol} size={22} />
                <span className="flex-1 truncate text-ink">{h.name}</span>
                <span className="text-xs text-muted uppercase">{h.symbol}</span>
                {h.rank && <span className="num w-10 text-right text-xs text-faint">#{h.rank}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
