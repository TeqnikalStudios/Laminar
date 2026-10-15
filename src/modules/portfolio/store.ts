"use client";

import { useSyncExternalStore } from "react";

// Stage 1 keeps watchlists and portfolios in the browser (localStorage), since
// there are no user accounts yet. Everything goes through this module, so
// Stage 2 can swap the storage for authenticated API calls backed by
// PostgreSQL (see db/schema.sql) without touching the pages.

export interface Lot {
  id: string;
  coinId: string;
  /** Units bought (positive). */
  quantity: number;
  /** USD paid per unit, used for profit/loss. */
  pricePerUnit: number;
  /** ISO date of the purchase. */
  date: string;
  note?: string;
}

interface UserData {
  version: 1;
  watchlist: string[];
  lots: Lot[];
}

const KEY = "laminar:user-data";
const DEFAULT: UserData = { version: 1, watchlist: ["bitcoin", "ethereum", "solana", "ripple", "binancecoin"], lots: [] };

let data: UserData = DEFAULT;
let loaded = false;
const listeners = new Set<() => void>();

function read(): UserData {
  if (loaded || typeof window === "undefined") return data;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserData>;
      data = {
        version: 1,
        watchlist: Array.isArray(parsed.watchlist) ? parsed.watchlist.filter((x) => typeof x === "string") : DEFAULT.watchlist,
        lots: Array.isArray(parsed.lots) ? parsed.lots.filter(isLot) : [],
      };
    }
  } catch {
    // Private mode or corrupted storage: fall back to defaults.
  }
  return data;
}

function isLot(x: unknown): x is Lot {
  const l = x as Lot;
  return !!l && typeof l.id === "string" && typeof l.coinId === "string" && Number.isFinite(l.quantity) && Number.isFinite(l.pricePerUnit);
}

function write(next: UserData) {
  data = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked; keep the in-memory copy for this session.
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      loaded = false;
      read();
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

function useUserData(): UserData {
  return useSyncExternalStore(subscribe, read, () => DEFAULT);
}

// ── Watchlist ───────────────────────────────────────────────

export function useWatchlist() {
  const { watchlist } = useUserData();
  return {
    ids: watchlist,
    has: (id: string) => watchlist.includes(id),
    toggle: (id: string) => {
      const cur = read();
      write({ ...cur, watchlist: cur.watchlist.includes(id) ? cur.watchlist.filter((x) => x !== id) : [...cur.watchlist, id] });
    },
  };
}

// ── Portfolio ───────────────────────────────────────────────

export function usePortfolio() {
  const { lots } = useUserData();
  return {
    lots,
    addLot: (lot: Omit<Lot, "id">) => {
      const cur = read();
      write({ ...cur, lots: [...cur.lots, { ...lot, id: crypto.randomUUID() }] });
    },
    removeLot: (id: string) => {
      const cur = read();
      write({ ...cur, lots: cur.lots.filter((l) => l.id !== id) });
    },
    removeCoin: (coinId: string) => {
      const cur = read();
      write({ ...cur, lots: cur.lots.filter((l) => l.coinId !== coinId) });
    },
  };
}

export interface Position {
  coinId: string;
  quantity: number;
  costBasis: number;
  avgPrice: number;
  value: number;
  pnl: number;
  pnlPct: number | null;
  /** False until a current price has loaded; value and P/L are 0 until then. */
  priced: boolean;
  lots: Lot[];
}

/** Groups lots by coin and values them at current prices. */
export function buildPositions(lots: Lot[], prices: Record<string, number>): Position[] {
  const byCoin = new Map<string, Lot[]>();
  for (const l of lots) byCoin.set(l.coinId, [...(byCoin.get(l.coinId) ?? []), l]);
  return [...byCoin.entries()]
    .map(([coinId, ls]) => {
      const quantity = ls.reduce((s, l) => s + l.quantity, 0);
      const costBasis = ls.reduce((s, l) => s + l.quantity * l.pricePerUnit, 0);
      const priced = prices[coinId] != null;
      const value = priced ? quantity * prices[coinId] : 0;
      return {
        coinId,
        quantity,
        costBasis,
        avgPrice: quantity ? costBasis / quantity : 0,
        value,
        pnl: priced ? value - costBasis : 0,
        pnlPct: priced && costBasis ? ((value - costBasis) / costBasis) * 100 : null,
        priced,
        lots: ls,
      };
    })
    .sort((a, b) => b.value - a.value);
}
