"use client";

import { BriefcaseBusiness, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CoinIcon } from "@/components/market/CoinIcon";
import { Change, EmptyState, PageHeader, Panel, PanelHeader } from "@/components/ui/primitives";
import { formatNumber, formatPct, formatUsd } from "@/lib/format";
import { useCoins, useMarkets } from "@/modules/market/client/useApi";
import type { CoinMarket } from "@/modules/market/types";
import { buildPositions, usePortfolio } from "@/modules/portfolio/store";

const ALLOC_COLORS = ["#22d3ee", "#8b5cf6", "#19d9a0", "#f5b84b", "#ff5c7c", "#60a5fa", "#f472b6", "#a3e635"];

export function PortfolioView() {
  const { lots, addLot, removeLot, removeCoin } = usePortfolio();
  const top = useMarkets(100);
  const held = useCoins(lots.map((l) => l.coinId));

  const coinById = useMemo(() => {
    const m = new Map<string, CoinMarket>();
    for (const c of top.data ?? []) m.set(c.id, c);
    for (const c of held.data ?? []) m.set(c.id, c);
    return m;
  }, [top.data, held.data]);

  const prices = useMemo(() => Object.fromEntries([...coinById.values()].map((c) => [c.id, c.price])), [coinById]);
  const positions = useMemo(() => buildPositions(lots, prices), [lots, prices]);

  const totals = useMemo(() => {
    const priced = positions.filter((p) => p.priced);
    const value = priced.reduce((s, p) => s + p.value, 0);
    const cost = priced.reduce((s, p) => s + p.costBasis, 0);
    // Value 24h ago, from each coin's 24h change.
    const prev = priced.reduce((s, p) => {
      const ch = coinById.get(p.coinId)?.change24h;
      return s + (ch == null ? p.value : p.value / (1 + ch / 100));
    }, 0);
    return { value, cost, pnl: value - cost, pnlPct: cost ? ((value - cost) / cost) * 100 : null, day: value - prev, dayPct: prev ? ((value - prev) / prev) * 100 : null };
  }, [positions, coinById]);

  return (
    <>
      <PageHeader
        eyebrow="My Portfolio"
        title="Holdings & performance"
        description="Record each purchase to track quantity, cost basis and profit/loss at live prices. Stored in this browser until accounts arrive in Stage 2."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Portfolio value" value={formatUsd(totals.value)} glow />
        <Stat label="24h change" value={<span className={totals.day >= 0 ? "text-up" : "text-down"}>{signed(totals.day)}</span>} sub={<Change value={totals.dayPct} className="text-xs" />} />
        <Stat label="Total cost basis" value={formatUsd(totals.cost)} />
        <Stat label="Unrealized P/L" value={<span className={totals.pnl >= 0 ? "text-up" : "text-down"}>{signed(totals.pnl)}</span>} sub={<Change value={totals.pnlPct} className="text-xs" />} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="self-start overflow-hidden">
          <PanelHeader title="Positions" subtitle={`${positions.length} assets · ${lots.length} purchases`} />
          {positions.length === 0 ? (
            <EmptyState icon={<BriefcaseBusiness size={28} />} title="No holdings yet">
              Add a purchase with the form to start tracking value and profit/loss.
            </EmptyState>
          ) : (
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-y border-line text-[11px] tracking-wide text-faint uppercase">
                    <th className="px-4 py-2.5 text-left font-medium">Asset</th>
                    <th className="px-3 py-2.5 text-right font-medium">Price</th>
                    <th className="px-3 py-2.5 text-right font-medium">Holdings</th>
                    <th className="px-3 py-2.5 text-right font-medium">Avg buy</th>
                    <th className="px-3 py-2.5 text-right font-medium">P/L</th>
                    <th className="px-3 py-2.5 text-right font-medium">Allocation</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p, i) => {
                    const c = coinById.get(p.coinId);
                    return (
                      <tr key={p.coinId} className="border-b border-line/60 align-top">
                        <td className="px-4 py-3">
                          <Link href={`/charts/${p.coinId}`} className="flex items-center gap-3 hover:text-flow">
                            <CoinIcon src={c?.image} symbol={c?.symbol ?? p.coinId} size={26} />
                            <div>
                              <div className="font-medium">{c?.name ?? p.coinId}</div>
                              <div className="text-xs text-faint uppercase">{c?.symbol}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="num px-3 py-3 text-right">
                          {formatUsd(c?.price)}
                          <div>
                            <Change value={c?.change24h} className="text-xs" />
                          </div>
                        </td>
                        <td className="num px-3 py-3 text-right">
                          {p.priced ? formatUsd(p.value) : "—"}
                          <div className="text-xs text-muted">
                            {formatNumber(p.quantity)} {c?.symbol.toUpperCase()}
                          </div>
                        </td>
                        <td className="num px-3 py-3 text-right">{formatUsd(p.avgPrice)}</td>
                        <td className={`num px-3 py-3 text-right ${p.pnl >= 0 ? "text-up" : "text-down"}`}>
                          {p.priced ? signed(p.pnl) : "—"}
                          <div className="text-xs">{formatPct(p.pnlPct)}</div>
                        </td>
                        <td className="num px-3 py-3 text-right">
                          {totals.value ? `${((p.value / totals.value) * 100).toFixed(1)}%` : "—"}
                          <div className="mt-1.5 ml-auto h-1 w-16 rounded-full bg-white/5">
                            <div className="h-1 rounded-full" style={{ width: `${totals.value ? (p.value / totals.value) * 100 : 0}%`, background: ALLOC_COLORS[i % ALLOC_COLORS.length] }} />
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <button
                            onClick={() => confirm(`Remove all ${c?.name ?? p.coinId} purchases?`) && removeCoin(p.coinId)}
                            aria-label={`Remove ${c?.name ?? p.coinId}`}
                            className="rounded-md p-1.5 text-faint hover:bg-down/10 hover:text-down"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="flex flex-col gap-5">
          <AddLotForm coins={top.data ?? []} onAdd={addLot} />
          {positions.length > 0 && (
            <Panel>
              <PanelHeader title="Allocation" />
              <div className="px-5 pb-5">
                <div className="flex h-3 overflow-hidden rounded-full bg-white/5">
                  {positions.map((p, i) => (
                    <div key={p.coinId} style={{ width: `${totals.value ? (p.value / totals.value) * 100 : 0}%`, background: ALLOC_COLORS[i % ALLOC_COLORS.length] }} />
                  ))}
                </div>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {positions.map((p, i) => (
                    <li key={p.coinId} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-sm" style={{ background: ALLOC_COLORS[i % ALLOC_COLORS.length] }} />
                      <span className="flex-1 text-muted">{coinById.get(p.coinId)?.name ?? p.coinId}</span>
                      <span className="num">{totals.value ? `${((p.value / totals.value) * 100).toFixed(1)}%` : "—"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
          )}
        </div>
      </div>

      {lots.length > 0 && (
        <Panel className="mt-5 overflow-hidden">
          <PanelHeader title="Purchase history" />
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-y border-line text-[11px] tracking-wide text-faint uppercase">
                  <th className="px-4 py-2.5 text-left font-medium">Date</th>
                  <th className="px-3 py-2.5 text-left font-medium">Asset</th>
                  <th className="px-3 py-2.5 text-right font-medium">Quantity</th>
                  <th className="px-3 py-2.5 text-right font-medium">Price paid</th>
                  <th className="px-3 py-2.5 text-right font-medium">Cost</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {[...lots]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((l) => (
                    <tr key={l.id} className="border-b border-line/60">
                      <td className="num px-4 py-2.5 text-muted">{l.date}</td>
                      <td className="px-3 py-2.5">{coinById.get(l.coinId)?.name ?? l.coinId}</td>
                      <td className="num px-3 py-2.5 text-right">{formatNumber(l.quantity)}</td>
                      <td className="num px-3 py-2.5 text-right">{formatUsd(l.pricePerUnit)}</td>
                      <td className="num px-3 py-2.5 text-right">{formatUsd(l.quantity * l.pricePerUnit)}</td>
                      <td className="py-2.5 pr-3">
                        <button onClick={() => removeLot(l.id)} aria-label="Delete purchase" className="rounded-md p-1.5 text-faint hover:bg-down/10 hover:text-down">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </>
  );
}

function signed(n: number) {
  return `${n >= 0 ? "+" : "−"}${formatUsd(Math.abs(n))}`;
}

function Stat({ label, value, sub, glow }: { label: string; value: React.ReactNode; sub?: React.ReactNode; glow?: boolean }) {
  return (
    <Panel glow={glow} className="animate-rise px-5 py-4">
      <p className="text-[11px] tracking-wide text-muted uppercase">{label}</p>
      <p className="num mt-1.5 text-xl font-semibold sm:text-2xl">{value}</p>
      {sub && <div className="mt-0.5">{sub}</div>}
    </Panel>
  );
}

function AddLotForm({ coins, onAdd }: { coins: CoinMarket[]; onAdd: (l: { coinId: string; quantity: number; pricePerUnit: number; date: string }) => void }) {
  const [coinId, setCoinId] = useState("bitcoin");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const current = coins.find((c) => c.id === coinId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const quantity = Number(qty);
    const pricePerUnit = price === "" ? current?.price ?? NaN : Number(price);
    if (!(quantity > 0)) return setError("Enter a quantity above zero.");
    if (!(pricePerUnit >= 0)) return setError("Enter the price you paid per unit.");
    onAdd({ coinId, quantity, pricePerUnit, date });
    setQty("");
    setPrice("");
    setError("");
  };

  const field = "h-9 w-full rounded-lg border border-line bg-void/60 px-3 text-sm focus:border-flow/50 focus:outline-none";

  return (
    <Panel glow>
      <PanelHeader title="Add purchase" />
      <form onSubmit={submit} className="space-y-3 px-5 pb-5">
        <label className="block text-xs text-muted">
          Asset
          <select value={coinId} onChange={(e) => setCoinId(e.target.value)} className={`${field} mt-1`}>
            {coins.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.symbol.toUpperCase()})
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-muted">
            Quantity
            <input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0.5" className={`${field} num mt-1`} />
          </label>
          <label className="block text-xs text-muted">
            Price per unit (USD)
            <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={current ? String(current.price) : "0"} className={`${field} num mt-1`} />
          </label>
        </div>
        <label className="block text-xs text-muted">
          Date
          <input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className={`${field} mt-1`} />
        </label>
        {error && <p className="text-xs text-down">{error}</p>}
        <p className="text-[11px] text-faint">Leave price empty to use the current market price.</p>
        <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-flow to-flow-2 py-2 text-sm font-semibold text-void transition-opacity hover:opacity-90">
          <Plus size={15} /> Add to portfolio
        </button>
      </form>
    </Panel>
  );
}
