import type { EdgeRoute } from "../../../schema";
import type { PathGeom, Seg } from "./_geom-types";
import { controlPoint, makeCubicSeg } from "./_geom-bezier";

// Path geometry: single source of truth for `d` and per-arc
// position/tangent. Replaces finite-difference normal sampling, which
// produced point/tangent inconsistency at the end of a bezier (the
// tangent was clamped away from the path end while the point was
// not, so on a tightly curling cubic the label drifted ~25–30px off
// the parallel curve). Here, point and tangent are always evaluated
// at the same parameter, so that mismatch is structurally impossible.

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
