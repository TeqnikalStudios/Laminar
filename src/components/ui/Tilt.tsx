"use client";

import type { CSSProperties, PointerEvent } from "react";

// Pointer-driven 3D tilt. Writes CSS variables read by the `.tilt` class in
// globals.css, so there is no re-render per mouse move.
const MAX_DEG = 6;

function onMove(e: PointerEvent<HTMLElement>) {
  if (e.pointerType !== "mouse") return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width;
  const py = (e.clientY - r.top) / r.height;
  el.style.setProperty("--tilt-x", `${((0.5 - py) * MAX_DEG).toFixed(2)}deg`);
  el.style.setProperty("--tilt-y", `${((px - 0.5) * MAX_DEG).toFixed(2)}deg`);
  el.style.setProperty("--tilt-mx", `${(px * 100).toFixed(1)}%`);
  el.style.setProperty("--tilt-my", `${(py * 100).toFixed(1)}%`);
}

function onLeave(e: PointerEvent<HTMLElement>) {
  const s = e.currentTarget.style;
  s.setProperty("--tilt-x", "0deg");
  s.setProperty("--tilt-y", "0deg");
}

/** Props that make any element tilt toward the pointer; pair with the `tilt` class. */
export function tiltProps(style?: CSSProperties) {
  return { onPointerMove: onMove, onPointerLeave: onLeave, style };
}
