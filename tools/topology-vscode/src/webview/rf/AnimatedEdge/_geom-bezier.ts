import type { Pt, Seg } from "./_geom-types";

type CubicSeg = Extract<Seg, { kind: "cubic" }>;

// Mirrors reactflow's getBezierPath control-point math.
function controlOffset(distance: number): number {
  return distance >= 0 ? 0.5 * distance : 0.25 * 25 * Math.sqrt(-distance);
}
export function controlPoint(pos: string, x1: number, y1: number, x2: number, y2: number): Pt {
  switch (pos) {
    case "left":   return { x: x1 - controlOffset(x1 - x2), y: y1 };
    case "right":  return { x: x1 + controlOffset(x2 - x1), y: y1 };
    case "top":    return { x: x1, y: y1 - controlOffset(y1 - y2) };
    case "bottom": return { x: x1, y: y1 + controlOffset(y2 - y1) };
    default:       return { x: x1, y: y1 };
  }
}

export function bezierAt(seg: CubicSeg, t: number): Pt {
  const u = 1 - t;
  const a = u*u*u, b = 3*u*u*t, c = 3*u*t*t, d = t*t*t;
  return {
    x: a*seg.p0.x + b*seg.c1.x + c*seg.c2.x + d*seg.p1.x,
    y: a*seg.p0.y + b*seg.c1.y + c*seg.c2.y + d*seg.p1.y,
  };
}
export function bezierTangentAt(seg: CubicSeg, t: number): Pt {
  const u = 1 - t;
  const a = 3*u*u, b = 6*u*t, c = 3*t*t;
  return {
    x: a*(seg.c1.x-seg.p0.x) + b*(seg.c2.x-seg.c1.x) + c*(seg.p1.x-seg.c2.x),
    y: a*(seg.c1.y-seg.p0.y) + b*(seg.c2.y-seg.c1.y) + c*(seg.p1.y-seg.c2.y),
  };
}

export function makeCubicSeg(p0: Pt, c1: Pt, c2: Pt, p1: Pt): CubicSeg {
  return { kind: "cubic", p0, c1, c2, p1 };
}

// Newton on the projection of (target - B(t)) onto the unit tangent.
export function findCubicT(seg: CubicSeg, target: Pt, t0: number): number {
  let t = Math.max(0, Math.min(1, t0));
  for (let i = 0; i < 4; i++) {
    const p = bezierAt(seg, t);
    const tg = bezierTangentAt(seg, t);
    const denom = tg.x * tg.x + tg.y * tg.y;
    if (denom < 1e-9) break;
    const dx = target.x - p.x, dy = target.y - p.y;
    const step = (tg.x * dx + tg.y * dy) / denom;
    const next = Math.max(0, Math.min(1, t + step));
    if (Math.abs(next - t) < 1e-5) { t = next; break; }
    t = next;
  }
  return t;
}
