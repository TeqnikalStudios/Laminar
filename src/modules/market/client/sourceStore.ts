"use client";

import { useSyncExternalStore } from "react";
import type { DataSource } from "../types";

// Tracks where the most recent market response came from so the shell can
// show a Live / Demo badge and explain fallbacks.

interface SourceState {
  source: DataSource | null;
  notice?: string;
  updatedAt?: string;
}

let state: SourceState = { source: null };
const listeners = new Set<() => void>();

export function reportSource(source: DataSource, notice: string | undefined, updatedAt: string) {
  if (state.source === source && state.notice === notice && state.updatedAt === updatedAt) return;
  state = { source, notice, updatedAt };
  listeners.forEach((l) => l());
}

export function useDataSource(): SourceState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}
