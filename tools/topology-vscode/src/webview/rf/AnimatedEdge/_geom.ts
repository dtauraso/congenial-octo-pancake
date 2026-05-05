import type { EdgeRoute } from "../../../schema";

export function midpoint(
  route: EdgeRoute,
  sx: number, sy: number, tx: number, ty: number, lane: number,
): { x: number; y: number } {
  if (route === "snake") {
    const midX = (sx + tx) / 2 + lane;
    return { x: midX, y: (sy + ty) / 2 };
  }
  if (route === "below") {
    const corridorY = Math.max(sy, ty) + 80 + lane;
    return { x: (sx + tx) / 2, y: corridorY };
  }
  return { x: (sx + tx) / 2, y: (sy + ty) / 2 };
}

// Path geometry: single source of truth for `d` and per-arc
// position/tangent. Replaces finite-difference normal sampling, which
// produced point/tangent inconsistency at the end of a bezier (the
// tangent was clamped away from the path end while the point was
// not, so on a tightly curling cubic the label drifted ~25–30px off
// the parallel curve). Here, point and tangent are always evaluated
// at the same parameter, so that mismatch is structurally impossible.

export type Pt = { x: number; y: number };

type StraightSeg = {
  kind: "straight";
  p0: Pt; p1: Pt;
  len: number;
  ux: number; uy: number;
};
type CubicSeg = {
  kind: "cubic";
  p0: Pt; c1: Pt; c2: Pt; p1: Pt;
};
export type Seg = StraightSeg | CubicSeg;
export type PathGeom = {
  d: string;
  segs: Seg[];
  cum: number[];
  straightTotal: number;
};

// Mirrors reactflow's getBezierPath control-point math.
function controlOffset(distance: number): number {
  return distance >= 0 ? 0.5 * distance : 0.25 * 25 * Math.sqrt(-distance);
}
function controlPoint(pos: string, x1: number, y1: number, x2: number, y2: number): Pt {
  switch (pos) {
    case "left":   return { x: x1 - controlOffset(x1 - x2), y: y1 };
    case "right":  return { x: x1 + controlOffset(x2 - x1), y: y1 };
    case "top":    return { x: x1, y: y1 - controlOffset(y1 - y2) };
    case "bottom": return { x: x1, y: y1 + controlOffset(y2 - y1) };
    default:       return { x: x1, y: y1 };
  }
}

function bezierAt(seg: CubicSeg, t: number): Pt {
  const u = 1 - t;
  const a = u*u*u, b = 3*u*u*t, c = 3*u*t*t, d = t*t*t;
  return {
    x: a*seg.p0.x + b*seg.c1.x + c*seg.c2.x + d*seg.p1.x,
    y: a*seg.p0.y + b*seg.c1.y + c*seg.c2.y + d*seg.p1.y,
  };
}
function bezierTangentAt(seg: CubicSeg, t: number): Pt {
  const u = 1 - t;
  const a = 3*u*u, b = 6*u*t, c = 3*t*t;
  return {
    x: a*(seg.c1.x-seg.p0.x) + b*(seg.c2.x-seg.c1.x) + c*(seg.p1.x-seg.c2.x),
    y: a*(seg.c1.y-seg.p0.y) + b*(seg.c2.y-seg.c1.y) + c*(seg.p1.y-seg.c2.y),
  };
}

function makeCubicSeg(p0: Pt, c1: Pt, c2: Pt, p1: Pt): CubicSeg {
  return { kind: "cubic", p0, c1, c2, p1 };
}

// Newton on the projection of (target - B(t)) onto the unit tangent.
function findCubicT(seg: CubicSeg, target: Pt, t0: number): number {
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

function addStraight(segs: Seg[], x0: number, y0: number, x1: number, y1: number) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const u = len || 1;
  segs.push({
    kind: "straight",
    p0: { x: x0, y: y0 }, p1: { x: x1, y: y1 },
    len, ux: dx/u, uy: dy/u,
  });
}

function finalize(d: string, segs: Seg[]): PathGeom {
  const cum: number[] = [];
  let acc = 0;
  for (const s of segs) {
    acc += s.kind === "straight" ? s.len : 0;
    cum.push(acc);
  }
  return { d, segs, cum, straightTotal: acc };
}

export function buildPathGeom(
  route: EdgeRoute,
  sx: number, sy: number, sp: string,
  tx: number, ty: number, tp: string,
  lane: number,
): PathGeom {
  const segs: Seg[] = [];
  if (route === "snake") {
    const midX = (sx + tx) / 2 + lane;
    addStraight(segs, sx, sy, midX, sy);
    addStraight(segs, midX, sy, midX, ty);
    addStraight(segs, midX, ty, tx, ty);
    const r = Math.min(15, Math.abs(midX - sx) / 2, Math.abs(tx - midX) / 2, Math.abs(ty - sy) / 2);
    if (!(r > 0.5)) {
      return finalize(`M ${sx},${sy} L ${midX},${sy} L ${midX},${ty} L ${tx},${ty}`, segs);
    }
    const sxDir = midX >= sx ? 1 : -1;
    const yDir  = ty   >= sy ? 1 : -1;
    const txDir = tx   >= midX ? 1 : -1;
    const d =
      `M ${sx},${sy} ` +
      `L ${midX - sxDir * r},${sy} ` +
      `Q ${midX},${sy} ${midX},${sy + yDir * r} ` +
      `L ${midX},${ty - yDir * r} ` +
      `Q ${midX},${ty} ${midX + txDir * r},${ty} ` +
      `L ${tx},${ty}`;
    return finalize(d, segs);
  }
  if (route === "below") {
    const corridorY = Math.max(sy, ty) + 80 + lane;
    addStraight(segs, sx, sy, sx, corridorY);
    addStraight(segs, sx, corridorY, tx, corridorY);
    addStraight(segs, tx, corridorY, tx, ty);
    const r = Math.min(15, Math.abs(corridorY - sy) / 2, Math.abs(corridorY - ty) / 2, Math.abs(tx - sx) / 2);
    if (!(r > 0.5)) {
      return finalize(`M ${sx},${sy} L ${sx},${corridorY} L ${tx},${corridorY} L ${tx},${ty}`, segs);
    }
    const xDir  = tx >= sx ? 1 : -1;
    const d =
      `M ${sx},${sy} ` +
      `L ${sx},${corridorY - r} ` +
      `Q ${sx},${corridorY} ${sx + xDir * r},${corridorY} ` +
      `L ${tx - xDir * r},${corridorY} ` +
      `Q ${tx},${corridorY} ${tx},${corridorY - r} ` +
      `L ${tx},${ty}`;
    return finalize(d, segs);
  }
  const c1 = controlPoint(sp, sx, sy, tx, ty);
  const c2 = controlPoint(tp, tx, ty, sx, sy);
  segs.push(makeCubicSeg({ x: sx, y: sy }, c1, c2, { x: tx, y: ty }));
  return finalize(`M ${sx},${sy} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${tx},${ty}`, segs);
}

// Multi-seg routes (snake, below) use finite difference on the SVG
// path so the tangent rotates smoothly through Q corners (geom.segs
// only carries straights — segment-walk would snap 90° at each cum
// boundary). Single cubic uses analytic B'(t) via Newton inversion.
export function queryTangent(
  geom: PathGeom,
  path: SVGPathElement,
  svgArc: number,
  svgTotal: number,
  point: Pt,
): Pt {
  if (geom.segs.length === 1 && geom.segs[0].kind === "cubic") {
    const seg = geom.segs[0];
    const t0 = svgTotal > 0 ? svgArc / svgTotal : 0;
    const t = findCubicT(seg, point, t0);
    const tg = bezierTangentAt(seg, t);
    const tlen = Math.hypot(tg.x, tg.y) || 1;
    return { x: tg.x / tlen, y: tg.y / tlen };
  }
  void geom;
  const eps = Math.min(0.5, svgTotal / 2);
  const sample = Math.min(Math.max(svgArc, eps), svgTotal - eps);
  const a = path.getPointAtLength(sample + eps);
  const b = path.getPointAtLength(sample - eps);
  const tx = a.x - b.x, ty = a.y - b.y;
  const tlen = Math.hypot(tx, ty) || 1;
  return { x: tx / tlen, y: ty / tlen };
}
