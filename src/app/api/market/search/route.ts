import type { NextRequest } from "next/server";
import { badRequest, marketResponse } from "@/modules/market/server/respond";

// GET /api/market/search?q=sol
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 1 || q.length > 50) return badRequest("Query must be 1-50 characters");
  return marketResponse((p) => p.search(q));
}
