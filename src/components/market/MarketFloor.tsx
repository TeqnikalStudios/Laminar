"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CoinIcon } from "@/components/market/CoinIcon";
import { Sparkline } from "@/components/market/Sparkline";
import { Change, Segmented } from "@/components/ui/primitives";
import { formatCompactUsd, formatUsd } from "@/lib/format";
import type { CoinMarket } from "@/modules/market/types";

// Isometric "market floor": the top assets stand as 3D towers on a slab.
// Tower height follows market cap (or volume), the glowing cap follows the
// 24h move. Pure SVG, no WebGL, so it renders on the server and on phones.

const COLS = 4;
const ROWS = 3;
const UNIT = 100; // projected pixels per grid unit
const FOOT = 0.54; // tower footprint as a share of its cell
const SLAB = 0.32; // slab thickness in grid units
const MARGIN = 0.38; // floor border around the grid
const MAX_H = 2.1;
const MIN_H = 0.32;
const COS = Math.cos(Math.PI / 6);

type Pt = [number, number];
const iso = (x: number, y: number, z = 0): Pt => [(x - y) * COS * UNIT, ((x + y) * 0.5 - z) * UNIT];
const pts = (...p: Pt[]) => p.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");

const METRICS = ["Market cap", "Volume"] as const;
type Metric = (typeof METRICS)[number];

/** Trend colour for a 24h move: green/red, saturating at ±8%. */
function trendColor(change: number | null) {
  const c = change ?? 0;
  const t = Math.min(1, Math.abs(c) / 8);
  const [r, g, b] = c >= 0 ? [25, 217, 160] : [255, 92, 124];
  const mix = (v: number) => Math.round(110 + (v - 110) * (0.35 + 0.65 * t));
  return `rgb(${mix(r)} ${mix(g)} ${mix(b)})`;
}

// Cells ordered back to front so the biggest assets stand at the back and
// never hide the smaller ones.
const CELLS = Array.from({ length: COLS * ROWS }, (_, i) => ({ gx: i % COLS, gy: Math.floor(i / COLS) })).sort(
  (a, b) => a.gx + a.gy - (b.gx + b.gy) || a.gx - b.gx,
);

interface Tower {
  coin: CoinMarket;
  x: number;
  y: number;
  h: number;
  color: string;
  order: number;
}

function layout(coins: CoinMarket[], metric: Metric): Tower[] {
  const top = [...coins].sort((a, b) => b.marketCap - a.marketCap).slice(0, CELLS.length);
  const value = (c: CoinMarket) => Math.max(1, metric === "Volume" ? c.volume24h : c.marketCap);
  const logs = top.map((c) => Math.log10(value(c)));
  const lo = Math.min(...logs);
  const span = Math.max(...logs) - lo || 1;
  return top.map((coin, i) => {
    const cell = CELLS[i];
    return {
      coin,
      x: cell.gx + (1 - FOOT) / 2,
      y: cell.gy + (1 - FOOT) / 2,
      h: MIN_H + ((logs[i] - lo) / span) * (MAX_H - MIN_H),
      color: trendColor(coin.change24h),
      order: cell.gx + cell.gy,
    };
  });
}

// Fixed scene bounds (independent of data) so the HTML label overlay can be
// placed with plain percentages.
const X0 = iso(-MARGIN, ROWS + MARGIN)[0] - 30;
const X1 = iso(COLS + MARGIN, -MARGIN)[0] + 30;
const Y0 = iso(0.5, 0.5, MAX_H)[1] - 110;
const Y1 = iso(COLS + MARGIN, ROWS + MARGIN, -SLAB)[1] + 40;
const VB_W = X1 - X0;
const VB_H = Y1 - Y0;
const toPct = ([x, y]: Pt) => ({ left: `${((x - X0) / VB_W) * 100}%`, top: `${((y - Y0) / VB_H) * 100}%` });

function Floor() {
  const a = -MARGIN;
  const bx = COLS + MARGIN;
  const by = ROWS + MARGIN;
  const z = -SLAB;
  const lines: string[] = [];
  for (let i = 0; i <= COLS; i++) lines.push(`M${pts(iso(i, a))}L${pts(iso(i, by))}`);
  for (let j = 0; j <= ROWS; j++) lines.push(`M${pts(iso(a, j))}L${pts(iso(bx, j))}`);
  return (
    <g>
      {/* glow pooled under the slab */}
      <ellipse cx={iso(COLS / 2, ROWS / 2)[0]} cy={iso(COLS / 2, ROWS / 2, z)[1] + 40} rx={VB_W * 0.42} ry={VB_H * 0.2} fill="url(#mf-underglow)" />
      {/* slab sides */}
      <polygon points={pts(iso(a, by), iso(bx, by), iso(bx, by, z), iso(a, by, z))} fill="url(#mf-side-l)" />
      <polygon points={pts(iso(bx, a), iso(bx, by), iso(bx, by, z), iso(bx, a, z))} fill="url(#mf-side-r)" />
      {/* lit edge where the top meets the sides */}
      <polyline points={pts(iso(a, by), iso(bx, by), iso(bx, a))} fill="none" stroke="rgb(139 92 246 / 0.55)" strokeWidth="1.5" />
      {/* top surface */}
      <polygon points={pts(iso(a, a), iso(bx, a), iso(bx, by), iso(a, by))} fill="url(#mf-top)" stroke="rgb(148 163 255 / 0.22)" strokeWidth="1" />
      <path d={lines.join("")} stroke="rgb(148 163 255 / 0.07)" strokeWidth="1" fill="none" />
    </g>
  );
}

function TowerShape({ t, active, index, onEnter, onOpen }: { t: Tower; active: boolean; index: number; onEnter: () => void; onOpen: () => void }) {
  const { x, y, h, color } = t;
  const w = FOOT;
  const x1 = x + w;
  const y1 = y + w;
  // Soft shadow cast towards the front-left.
  const sh = Math.min(0.9, h * 0.35);
  // Server-rack light rows on the front-left face.
  const rows = Math.max(1, Math.floor(h / 0.28));
  const lights = Array.from({ length: rows }, (_, i) => {
    const z = h - 0.18 - i * 0.26;
    if (z < 0.1) return null;
    const len = 0.25 + ((i * 37 + t.coin.symbol.length * 13) % 50) / 100;
    return `M${pts(iso(x + 0.08, y1, z))}L${pts(iso(x + 0.08 + w * len * 0.85, y1, z))}`;
  }).filter(Boolean);

  return (
    <g
      className="mf-tower"
      data-active={active || undefined}
      style={{ animationDelay: `${120 + index * 55}ms`, cursor: "pointer" }}
      onMouseEnter={onEnter}
      onClick={onOpen}
    >
      <polygon points={pts(iso(x, y1), iso(x1, y1), iso(x1 - sh * 0.2, y1 + sh), iso(x - sh * 0.2, y1 + sh))} fill="rgb(2 4 10 / 0.45)" filter="url(#mf-blur)" />
      <polygon points={pts(iso(x - 0.06, y - 0.06), iso(x1 + 0.06, y - 0.06), iso(x1 + 0.06, y1 + 0.06), iso(x - 0.06, y1 + 0.06))} fill="rgb(148 163 255 / 0.06)" stroke={color} strokeOpacity={active ? 0.6 : 0.15} />
      <g className="mf-body">
        {/* left (front-left) face */}
        <polygon points={pts(iso(x, y1), iso(x1, y1), iso(x1, y1, h), iso(x, y1, h))} fill="url(#mf-face-l)" />
        {/* right (front-right) face */}
        <polygon points={pts(iso(x1, y), iso(x1, y1), iso(x1, y1, h), iso(x1, y, h))} fill="url(#mf-face-r)" />
        <path d={lights.join("")} stroke={color} strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
        {/* emissive band along the top edges */}
        <polyline points={pts(iso(x, y1, h - 0.05), iso(x1, y1, h - 0.05), iso(x1, y, h - 0.05))} fill="none" stroke={color} strokeOpacity="0.5" strokeWidth="1.2" />
        {/* top cap */}
        <polygon points={pts(iso(x, y, h), iso(x1, y, h), iso(x1, y1, h), iso(x, y1, h))} fill={color} fillOpacity={active ? 1 : 0.85} />
        <polygon points={pts(iso(x + 0.1, y + 0.1, h), iso(x1 - 0.1, y + 0.1, h), iso(x1 - 0.1, y1 - 0.1, h), iso(x + 0.1, y1 - 0.1, h))} fill="url(#mf-cap-sheen)" />
        <polyline points={pts(iso(x, y1, h), iso(x1, y1, h), iso(x1, y, h))} fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="1" />
      </g>
    </g>
  );
}

export function MarketFloor({ coins }: { coins: CoinMarket[] | undefined }) {
  const router = useRouter();
  const [metric, setMetric] = useState<Metric>("Market cap");
  const [zoom, setZoom] = useState(1);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const towers = useMemo(() => (coins?.length ? layout(coins, metric) : []), [coins, metric]);
  const active = towers.find((t) => t.coin.id === hoverId) ?? towers[0];
  // The three biggest gainers get a live "data feed" line from above.
  const feeds = useMemo(
    () => [...towers].filter((t) => (t.coin.change24h ?? 0) > 0).sort((a, b) => b.coin.change24h! - a.coin.change24h!).slice(0, 3),
    [towers],
  );
  const breadth = towers.length ? towers.filter((t) => (t.coin.change24h ?? 0) > 0).length : null;
  const drawOrder = [...towers].sort((a, b) => a.order - b.order);

  return (
    <section className="panel panel-glow mf-stage relative overflow-hidden" aria-label="3D market floor of the top 12 assets">
      <div className="mf-backdrop" aria-hidden="true" />

      <header className="relative z-10 flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.22em] text-flow uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-up animate-pulse-dot" /> Market floor · top {towers.length || 12}
          </p>
          <h2 className="mt-1 text-[15px] font-semibold tracking-tight text-ink">Every tower is an asset</h2>
          <p className="mt-0.5 max-w-xs text-xs text-muted">Height shows {metric === "Volume" ? "24h volume" : "market cap"}, glow shows the 24h move. Tap a tower to open its chart.</p>
        </div>
        <div className="flex items-center gap-2">
          <Segmented label="Tower height" options={METRICS} value={metric} onChange={setMetric} />
        </div>
      </header>

      <div className="relative grid gap-3 px-2 pb-3 lg:grid-cols-[minmax(0,1fr)_260px] lg:px-5 lg:pb-5">
        <div className="relative overflow-hidden" onMouseLeave={() => setHoverId(null)}>
          <div className="relative mx-auto max-w-[820px] transition-transform duration-300" style={{ aspectRatio: `${VB_W} / ${VB_H}`, transform: `scale(${zoom})` }}>
            <svg viewBox={`${X0} ${Y0} ${VB_W} ${VB_H}`} className="absolute inset-0 h-full w-full overflow-visible" role="img" aria-label="Isometric towers sized by market value">
              <defs>
                <radialGradient id="mf-underglow">
                  <stop offset="0" stopColor="#8b5cf6" stopOpacity="0.35" />
                  <stop offset="0.6" stopColor="#22d3ee" stopOpacity="0.08" />
                  <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="mf-top" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#2a2350" />
                  <stop offset="0.55" stopColor="#1b1d40" />
                  <stop offset="1" stopColor="#121733" />
                </linearGradient>
                <linearGradient id="mf-side-l" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#151a33" />
                  <stop offset="1" stopColor="#070a16" />
                </linearGradient>
                <linearGradient id="mf-side-r" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#0d1124" />
                  <stop offset="1" stopColor="#04060c" />
                </linearGradient>
                <linearGradient id="mf-face-l" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#2a3358" />
                  <stop offset="1" stopColor="#151b36" />
                </linearGradient>
                <linearGradient id="mf-face-r" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#1b2242" />
                  <stop offset="1" stopColor="#0c1124" />
                </linearGradient>
                <linearGradient id="mf-cap-sheen" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="white" stopOpacity="0.35" />
                  <stop offset="1" stopColor="white" stopOpacity="0" />
                </linearGradient>
                <filter id="mf-blur" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" />
                </filter>
              </defs>

              <Floor />

              {feeds.map((t, i) => {
                const [tx, ty] = iso(t.x + FOOT / 2, t.y + FOOT / 2, t.h);
                const sx = tx + (i - 1) * 60;
                return (
                  <path
                    key={t.coin.id}
                    className="mf-feed"
                    d={`M${sx},${Y0} C${sx},${(Y0 + ty) / 2} ${tx},${(Y0 + ty) / 2 - 30} ${tx},${ty - 6}`}
                    fill="none"
                    stroke="var(--color-flow)"
                    strokeOpacity="0.55"
                    strokeWidth="1.6"
                    strokeDasharray="2 7"
                    strokeLinecap="round"
                  />
                );
              })}

              {drawOrder.map((t) => (
                <TowerShape
                  key={t.coin.id}
                  t={t}
                  index={towers.indexOf(t)}
                  active={t.coin.id === hoverId}
                  onEnter={() => setHoverId(t.coin.id)}
                  onOpen={() => router.push(`/charts/${t.coin.id}`)}
                />
              ))}
            </svg>

            {/* HTML labels keep text crisp and links keyboard-reachable. */}
            {towers.map((t, i) => (
              <Link
                key={t.coin.id}
                href={`/charts/${t.coin.id}`}
                onMouseEnter={() => setHoverId(t.coin.id)}
                onFocus={() => setHoverId(t.coin.id)}
                className={`mf-label animate-rise absolute flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-full border py-0.5 pr-2 pl-0.5 text-[9px] font-semibold whitespace-nowrap backdrop-blur-md sm:gap-1.5 sm:text-[11px] ${
                  t.coin.id === hoverId ? "z-20 border-flow/60 bg-panel-2 text-ink" : "z-10 border-line-strong bg-base/80 text-ink/90"
                }`}
                style={{ ...toPct(iso(t.x + FOOT / 2, t.y + FOOT / 2, t.h + 0.12)), animationDelay: `${300 + i * 55}ms` }}
              >
                <CoinIcon src={t.coin.image} symbol={t.coin.symbol} size={14} />
                <span className="uppercase">{t.coin.symbol}</span>
                <Change value={t.coin.change24h} className="hidden font-medium sm:inline" />
              </Link>
            ))}

            {!towers.length && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="skeleton px-4 py-2 text-xs text-muted">Loading the floor…</span>
              </div>
            )}
          </div>

          <div className="absolute right-2 bottom-2 hidden flex-col gap-1.5 sm:flex lg:right-0">
            {[
              { label: "Zoom in", icon: Plus, on: () => setZoom((z) => Math.min(1.6, +(z + 0.15).toFixed(2))) },
              { label: "Zoom out", icon: Minus, on: () => setZoom((z) => Math.max(0.7, +(z - 0.15).toFixed(2))) },
              { label: "Reset view", icon: RotateCcw, on: () => setZoom(1) },
            ].map(({ label, icon: Icon, on }) => (
              <button key={label} aria-label={label} title={label} onClick={on} className="mf-knob">
                <Icon size={14} />
              </button>
            ))}
          </div>

          <div className="absolute bottom-2 left-2 hidden items-center sm:flex gap-2 rounded-lg border border-line bg-base/70 px-2.5 py-1.5 text-[10px] text-muted backdrop-blur-md lg:left-0">
            <span className="num">−8%</span>
            <span className="h-1.5 w-20 rounded-full" style={{ background: `linear-gradient(90deg, ${trendColor(-8)}, ${trendColor(0)}, ${trendColor(8)})` }} />
            <span className="num">+8%</span>
          </div>
        </div>

        <aside className="relative z-10 flex flex-col gap-3">
          <div className="mf-card p-4">
            {active ? (
              <>
                <div className="flex items-center gap-2.5">
                  <CoinIcon src={active.coin.image} symbol={active.coin.symbol} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{active.coin.name}</p>
                    <p className="text-[11px] text-faint uppercase">
                      {active.coin.symbol} · rank #{active.coin.rank ?? "—"}
                    </p>
                  </div>
                  <Change value={active.coin.change24h} badge />
                </div>
                <p className="num mt-3 text-2xl font-semibold">{formatUsd(active.coin.price)}</p>
                <div className="-mx-1 mt-1">
                  <Sparkline data={active.coin.sparkline7d} width={228} height={44} />
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
                    <dt className="text-faint">Market cap</dt>
                    <dd className="num mt-0.5 font-medium">{formatCompactUsd(active.coin.marketCap)}</dd>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
                    <dt className="text-faint">24h volume</dt>
                    <dd className="num mt-0.5 font-medium">{formatCompactUsd(active.coin.volume24h)}</dd>
                  </div>
                </dl>
                <Link href={`/charts/${active.coin.id}`} className="mt-3 block rounded-lg bg-gradient-to-r from-flow to-flow-2 px-3 py-2 text-center text-xs font-semibold text-void">
                  Open {active.coin.symbol.toUpperCase()} chart
                </Link>
              </>
            ) : (
              <div className="space-y-2">
                <div className="skeleton h-7" />
                <div className="skeleton h-12" />
                <div className="skeleton h-10" />
              </div>
            )}
          </div>
          <div className="mf-card grid grid-cols-2 gap-3 p-4 text-xs">
            <div>
              <p className="text-faint">Advancing</p>
              <p className="num mt-0.5 text-lg font-semibold text-up">{breadth ?? "—"}</p>
            </div>
            <div>
              <p className="text-faint">Declining</p>
              <p className="num mt-0.5 text-lg font-semibold text-down">{breadth == null ? "—" : towers.length - breadth}</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
