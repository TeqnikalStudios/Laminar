import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { PageHeader, Panel } from "@/components/ui/primitives";

// Placeholder for navigation sections that are on the roadmap but not built.
// Says so plainly rather than showing fake functionality.
export function PlannedView({ eyebrow, title, stage, summary, items }: { eyebrow: string; title: string; stage: string; summary: string; items: string[] }) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={summary} />
      <Panel glow className="max-w-3xl p-6">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-warn/30 bg-warn/10 px-2.5 py-0.5 text-[11px] font-medium text-warn">Planned · {stage}</span>
          <span className="text-xs text-faint">Not available yet</span>
        </div>
        <p className="mt-4 text-sm text-muted">This section is designed but not built. When it ships it will include:</p>
        <ul className="mt-4 space-y-2.5">
          {items.map((it) => (
            <li key={it} className="flex gap-2.5 text-sm">
              <Circle size={14} className="mt-0.5 shrink-0 text-faint" />
              {it}
            </li>
          ))}
        </ul>
        <p className="mt-6 flex items-center gap-2 text-xs text-faint">
          <CheckCircle2 size={13} className="text-up" /> Available today: <Link href="/markets" className="text-flow hover:underline">Markets</Link>,
          <Link href="/charts/bitcoin" className="text-flow hover:underline">Charts</Link>,
          <Link href="/portfolio" className="text-flow hover:underline">Portfolio</Link> and
          <Link href="/watchlist" className="text-flow hover:underline">Watchlist</Link>.
        </p>
      </Panel>
    </>
  );
}
