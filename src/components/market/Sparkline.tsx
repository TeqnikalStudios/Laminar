// Lightweight SVG sparkline for tables and cards. Colour follows the net move.
export function Sparkline({ data, width = 120, height = 36, fill = true }: { data: number[]; width?: number; height?: number; fill?: boolean }) {
  if (data.length < 2) return <div style={{ width, height }} />;
  // Downsample long series so each sparkline stays a few dozen points.
  const step = Math.max(1, Math.floor(data.length / 60));
  const pts = data.filter((_, i) => i % step === 0 || i === data.length - 1);
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const x = (i: number) => (i / (pts.length - 1)) * width;
  const y = (v: number) => height - 2 - ((v - min) / span) * (height - 4);
  const line = pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const up = pts[pts.length - 1] >= pts[0];
  const color = up ? "var(--color-up)" : "var(--color-down)";
  const id = `sp-${up ? "u" : "d"}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={`${line}L${width},${height}L0,${height}Z`} fill={`url(#${id})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
