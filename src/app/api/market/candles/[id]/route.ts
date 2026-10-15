import type { NextRequest } from "next/server";
import { ALLOWED_DAYS } from "@/modules/market/types";
import { badRequest, COIN_ID, marketResponse } from "@/modules/market/server/respond";

// GET /api/market/candles/bitcoin?days=7
export async function GET(req: NextRequest, ctx: RouteContext<"/api/market/candles/[id]">) {
  const { id } = await ctx.params;
  const days = Number(req.nextUrl.searchParams.get("days") ?? 7);
  if (!COIN_ID.test(id)) return badRequest("Invalid coin id");
  if (!ALLOWED_DAYS.includes(days)) return badRequest(`days must be one of ${ALLOWED_DAYS.join(", ")}`);
  return marketResponse((p) => p.getCandles(id, days));
}
