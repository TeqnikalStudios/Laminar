import type { HTMLAttributes, ReactNode } from "react";
import { formatPct, trendClass } from "@/lib/format";

export function Panel({ children, className = "", glow = false, ...rest }: { children: ReactNode; className?: string; glow?: boolean } & HTMLAttributes<HTMLElement>) {
  return (
    <section {...rest} className={`panel ${glow ? "panel-glow" : ""} ${className}`}>
      {children}
    </section>
  );
}

export function PanelHeader({ title, subtitle, right }: { title: string; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
      <div>
        <h2 className="text-[13px] font-semibold tracking-wide text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

export function PageHeader({ eyebrow, title, description, right }: { eyebrow?: string; title: string; description?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-rise">
      <div>
        {eyebrow && <p className="mb-1.5 text-[11px] font-medium tracking-[0.22em] text-flow uppercase">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {right}
    </div>
  );
}

export function Change({ value, className = "", badge = false }: { value: number | null | undefined; className?: string; badge?: boolean }) {
  const tone = trendClass(value);
  if (!badge) return <span className={`num ${tone} ${className}`}>{formatPct(value)}</span>;
  const bg = value == null || value === 0 ? "bg-white/5" : value > 0 ? "bg-up/10" : "bg-down/10";
  return <span className={`num inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium ${bg} ${tone} ${className}`}>{formatPct(value)}</span>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-line bg-void/60 p-0.5">
      {options.map((o) => (
        <button
          key={o}
          role="radio"
          aria-checked={o === value}
          onClick={() => onChange(o)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${o === value ? "bg-panel-2 text-ink shadow-[inset_0_0_0_1px_var(--color-line-strong)]" : "text-muted hover:text-ink"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-down/30 bg-down/5 px-4 py-3 text-sm text-down">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="rounded-md border border-down/30 px-2 py-1 text-xs hover:bg-down/10">
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && <div className="mb-3 text-faint">{icon}</div>}
      <p className="text-sm font-medium text-ink">{title}</p>
      {children && <div className="mt-1.5 max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}
