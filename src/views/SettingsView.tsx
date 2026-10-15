"use client";

import { Download, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/primitives";
import { useDataSource } from "@/modules/market/client/sourceStore";
import { usePortfolio, useWatchlist } from "@/modules/portfolio/store";

const KEY = "laminar:user-data";

export function SettingsView() {
  const { source } = useDataSource();
  const { lots } = usePortfolio();
  const { ids } = useWatchlist();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");

  const exportData = () => {
    const blob = new Blob([localStorage.getItem(KEY) ?? "{}"], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `laminar-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (f: File) => {
    try {
      const parsed = JSON.parse(await f.text());
      if (!Array.isArray(parsed.watchlist) || !Array.isArray(parsed.lots)) throw new Error();
      localStorage.setItem(KEY, JSON.stringify({ version: 1, watchlist: parsed.watchlist, lots: parsed.lots }));
      location.reload();
    } catch {
      setMsg("That file isn't a LAMINAR backup.");
    }
  };

  const btn = "inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:border-line-strong hover:bg-white/[0.03]";

  return (
    <>
      <PageHeader eyebrow="Account Settings" title="Settings" description="Sign-in, profiles and identity verification arrive with Stage 2. For now your data stays in this browser." />
      <div className="grid max-w-4xl gap-5">
        <Panel>
          <PanelHeader title="Your data" subtitle={`${ids.length} watchlist assets · ${lots.length} portfolio purchases, stored in this browser only`} />
          <div className="flex flex-wrap gap-3 px-5 pb-5">
            <button onClick={exportData} className={btn}>
              <Download size={15} /> Export backup
            </button>
            <button onClick={() => file.current?.click()} className={btn}>
              <Upload size={15} /> Import backup
            </button>
            <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
            <button
              onClick={() => {
                if (confirm("Delete your watchlist and portfolio from this browser? This can't be undone.")) {
                  localStorage.removeItem(KEY);
                  location.reload();
                }
              }}
              className={`${btn} text-down hover:border-down/40`}
            >
              <Trash2 size={15} /> Clear local data
            </button>
          </div>
          {msg && <p className="px-5 pb-4 text-sm text-down">{msg}</p>}
        </Panel>
        <Panel>
          <PanelHeader title="Market data" />
          <dl className="px-5 pb-5 text-sm">
            <div className="flex justify-between border-b border-line/60 py-2.5">
              <dt className="text-muted">Current source</dt>
              <dd>{source === "live" ? "CoinGecko (live)" : source === "demo" ? "Demo data" : source === "demo-fallback" ? "Demo data (live unavailable)" : "—"}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-muted">Configured by</dt>
              <dd className="font-mono text-xs">MARKET_DATA_MODE, COINGECKO_API_KEY</dd>
            </div>
          </dl>
        </Panel>
      </div>
    </>
  );
}
