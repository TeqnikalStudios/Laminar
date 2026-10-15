import type { Metadata } from "next";
import { PortfolioView } from "@/views/PortfolioView";

export const metadata: Metadata = { title: "My Portfolio" };

export default function Page() {
  return <PortfolioView />;
}
