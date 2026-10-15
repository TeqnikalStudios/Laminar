"use client";

import { useState } from "react";

// Coin logo with a generated monogram fallback (demo mode has no images,
// and remote logos can fail to load).
export function CoinIcon({ src, symbol, size = 24 }: { src?: string; symbol: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} loading="lazy" onError={() => setFailed(true)} className="shrink-0 rounded-full" style={{ width: size, height: size }} />;
  }
  let h = 0;
  for (const c of symbol) h = (h * 31 + c.charCodeAt(0)) % 360;
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white/90"
      style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(135deg, hsl(${h} 70% 45%), hsl(${(h + 50) % 360} 70% 30%))` }}
    >
      {symbol.slice(0, 3).toUpperCase()}
    </span>
  );
}
