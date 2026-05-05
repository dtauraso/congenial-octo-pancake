import type { EdgeRoute } from "../../../schema";

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
