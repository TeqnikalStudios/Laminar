// LAMINAR mark: three parallel streamlines inside a rounded prism, a nod to
// laminar (smooth, layered) flow.
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="lm-g" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="37" height="37" rx="11" fill="#0b1020" stroke="url(#lm-g)" strokeWidth="1.5" />
      <path d="M9 14c5-4 9 4 14 0s7-3 8-2" stroke="url(#lm-g)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M9 20.5c5-4 9 4 14 0s7-3 8-2" stroke="url(#lm-g)" strokeWidth="2.4" strokeLinecap="round" opacity=".75" />
      <path d="M9 27c5-4 9 4 14 0s7-3 8-2" stroke="url(#lm-g)" strokeWidth="2.4" strokeLinecap="round" opacity=".5" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-[0.32em] text-ink">LAMINAR</span>
    </span>
  );
}
