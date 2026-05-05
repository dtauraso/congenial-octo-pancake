import type { PathGeom, Pt } from "./_geom-types";
import { bezierTangentAt, findCubicT } from "./_geom-bezier";

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
