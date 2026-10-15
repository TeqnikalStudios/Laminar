import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChartView } from "@/views/ChartView";

const COIN_ID = /^[a-z0-9][a-z0-9-]{0,79}$/;

export async function generateMetadata({ params }: PageProps<"/charts/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `${id} chart` };
}

export default async function Page({ params }: PageProps<"/charts/[id]">) {
  const { id } = await params;
  if (!COIN_ID.test(id)) notFound();
  // key resets range and chart state when switching coins.
  return <ChartView key={id} id={id} />;
}
