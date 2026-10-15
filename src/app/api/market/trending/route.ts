import { marketResponse } from "@/modules/market/server/respond";

// GET /api/market/trending
export async function GET() {
  return marketResponse((p) => p.getTrending());
}
