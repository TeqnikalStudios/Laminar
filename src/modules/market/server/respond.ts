import "server-only";
import { NextResponse } from "next/server";
import type { ApiEnvelope } from "../types";
import { withMarketData, type MarketProvider } from "./provider";

/** Wraps a provider call in LAMINAR's standard JSON envelope. */
export async function marketResponse<T>(fn: (p: MarketProvider) => Promise<T>) {
  try {
    const { data, source, notice } = await withMarketData(fn);
    const body: ApiEnvelope<T> = { data, source, updatedAt: new Date().toISOString(), ...(notice ? { notice } : {}) };
    return NextResponse.json(body, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/** CoinGecko ids are lowercase slugs. Rejecting anything else keeps user input out of upstream URLs. */
export const COIN_ID = /^[a-z0-9][a-z0-9-]{0,79}$/;
