import type { Metadata } from "next";
import { MarketsView } from "@/views/MarketsView";

export const metadata: Metadata = { title: "Markets" };

export default function Page() {
  return <MarketsView />;
}
