import { marketResponse } from "@/modules/market/server/respond";

// GET /api/market/global
export async function GET() {
  return marketResponse((p) => p.getGlobal());
}
