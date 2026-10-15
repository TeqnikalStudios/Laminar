"use client";

import {
  Bell,
  BriefcaseBusiness,
  CandlestickChart,
  Coins,
  LayoutDashboard,
  Layers,
  Menu,
  Settings,
  Star,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { CoinSearch } from "@/components/market/CoinSearch";
import { useDataSource } from "@/modules/market/client/sourceStore";
import { timeAgo } from "@/lib/format";
import { Wordmark } from "./Logo";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown for sections that are planned but not built yet. */
  stage?: string;
}

const NAV: { title: string; items: NavItem[] }[] = [
  {
    title: "Markets",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/markets", label: "Cryptocurrency Markets", icon: Coins },
      { href: "/charts/bitcoin", label: "Advanced Charts", icon: CandlestickChart },
      { href: "/portfolio", label: "My Portfolio", icon: BriefcaseBusiness },
      { href: "/watchlist", label: "Watchlist", icon: Star },
    ],
  },
  {
    title: "Tokenization",
    items: [
      { href: "/tokenization", label: "Asset Tokenization", icon: Layers, stage: "Stage 2" },
      { href: "/tokenized-assets", label: "My Tokenized Assets", icon: Layers, stage: "Stage 2" },
      { href: "/wallet", label: "Wallet", icon: Wallet, stage: "Stage 4" },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/notifications", label: "Notifications", icon: Bell, stage: "Stage 2" },
      { href: "/settings", label: "Account Settings", icon: Settings },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href.startsWith("/charts")) return pathname.startsWith("/charts");
  return pathname.startsWith(href);
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-6" aria-label="Main">
      {NAV.map((group) => (
        <div key={group.title}>
          <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.2em] text-faint uppercase">{group.title}</p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map(({ href, label, icon: Icon, stage }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                      active ? "bg-gradient-to-r from-flow/15 to-transparent text-ink" : "text-muted hover:bg-white/[0.03] hover:text-ink"
                    }`}
                  >
                    {active && <span className="absolute top-1.5 bottom-1.5 left-0 w-[2px] rounded-full bg-gradient-to-b from-flow to-flow-2" />}
                    <Icon size={16} className={active ? "text-flow" : "text-faint group-hover:text-muted"} />
                    <span className="flex-1 truncate">{label}</span>
                    {stage && <span className="rounded border border-line px-1.5 py-px text-[9px] tracking-wide text-faint uppercase">{stage}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SourceBadge() {
  const { source, notice, updatedAt } = useDataSource();
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);
  if (!source) return null;
  const live = source === "live";
  return (
    <div
      title={notice ?? (live ? "Live data from CoinGecko" : "Demo data (MARKET_DATA_MODE=demo)")}
      className={`hidden items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium md:flex ${live ? "border-up/25 text-up" : "border-warn/30 text-warn"}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-up animate-pulse-dot" : "bg-warn"}`} />
      {live ? "Live" : "Demo data"}
      {updatedAt && <span className="text-faint">· {timeAgo(updatedAt)}</span>}
    </div>
  );
}

function FallbackBanner() {
  const { source, notice } = useDataSource();
  if (source !== "demo-fallback") return null;
  return (
    <div role="status" className="border-b border-warn/20 bg-warn/[0.06] px-4 py-2 text-center text-xs text-warn sm:px-8">
      {notice} Add a CoinGecko API key in your environment, or check your network.
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-base/80 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/" aria-label="LAMINAR home">
            <Wordmark />
          </Link>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto px-3 py-4">
          <NavList />
        </div>
        <div className="border-t border-line px-5 py-4 text-[11px] leading-relaxed text-faint">
          Market data by CoinGecko. Charts by TradingView. Not financial advice.
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-line bg-base animate-rise">
            <div className="flex h-16 items-center justify-between px-5">
              <Wordmark />
              <button aria-label="Close menu" onClick={() => setOpen(false)} className="rounded-md p-1.5 text-muted hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <div className="scroll-thin flex-1 overflow-y-auto px-3 py-4">
              <NavList onNavigate={() => setOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-line bg-void/70 backdrop-blur-xl">
        <FallbackBanner />
        <div className="flex h-16 items-center gap-3 px-4 sm:px-8">
          <button aria-label="Open menu" onClick={() => setOpen(true)} className="rounded-md p-1.5 text-muted hover:text-ink lg:hidden">
            <Menu size={20} />
          </button>
          <Link href="/" className="lg:hidden" aria-label="LAMINAR home">
            <span className="text-sm font-semibold tracking-[0.3em]">LAMINAR</span>
          </Link>
          <div className="flex flex-1 justify-end lg:justify-start">
            <div className="hidden w-full max-w-md sm:block">
              <CoinSearch />
            </div>
          </div>
          <SourceBadge />
        </div>
        <div className="px-4 pb-3 sm:hidden">
          <CoinSearch />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
