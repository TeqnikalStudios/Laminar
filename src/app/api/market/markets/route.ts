import type { NextRequest } from "next/server";
import { badRequest, COIN_ID, marketResponse } from "@/modules/market/server/respond";

// GET /api/market/markets?perPage=100&page=1
// GET /api/market/markets?ids=bitcoin,ethereum
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const perPage = Math.min(250, Math.max(1, Number(sp.get("perPage")) || 100));
  const page = Math.min(20, Math.max(1, Number(sp.get("page")) || 1));
  const ids = sp.get("ids")?.split(",").map((s) => s.trim()).filter(Boolean);
  if (ids && (ids.length > 100 || !ids.every((id) => COIN_ID.test(id)))) return badRequest("Invalid ids");
  return marketResponse((p) => p.getMarkets({ perPage, page, ids }));
}
