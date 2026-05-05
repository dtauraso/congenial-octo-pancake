import type { EdgeRoute } from "../../../schema";
import { type PathGeom, queryTangent, type Pt } from "./_geom";
import { PULSE_DASH_PX, PULSE_LABEL_NORMAL_PX } from "./_constants";

export type LabelPlacement = {
  point: Pt;
  tangent: Pt;
  nx: number; ny: number;
  lx: number; ly: number;
  labelOpacity: number;
};

// Label rides a fixed offset ahead of the back of the dash window —
// NOT the visible-midpoint of the clipped dash. The visible-midpoint
// formula halves label speed in the final PULSE_DASH_PX once the dash
// leading edge clamps to svgArc. Riding the unclamped midpoint and
// extrapolating past the path end along the end tangent keeps
// constant speed.
export function computeLabelPlacement(
  geom: PathGeom,
  path: SVGPathElement,
  route: EdgeRoute,
  arcTraveled: number,
  svgArc: number,
): LabelPlacement {
  const labelArcSvg = arcTraveled + PULSE_DASH_PX / 2;
  const queryArc = Math.min(labelArcSvg, svgArc);
  const queryPoint = path.getPointAtLength(queryArc);
  const tangent = queryTangent(geom, path, queryArc, svgArc, queryPoint);
  const point = labelArcSvg <= svgArc
    ? { x: queryPoint.x, y: queryPoint.y }
    : { x: queryPoint.x + tangent.x * (labelArcSvg - svgArc),
        y: queryPoint.y + tangent.y * (labelArcSvg - svgArc) };
  // Axis-aligned routes (snake, below): corner tangents stay in the
  // first quadrant so |ty|, -|tx| keeps the label always above
  // horizontal AND perpendicular through quad corners. Cubic/line:
  // tangent crosses quadrants — use classic perpendicular-with-
  // upward-bias.
  let nx: number, ny: number;
  if (route === "snake" || route === "below") {
    nx =  Math.abs(tangent.y);
    ny = -Math.abs(tangent.x);
  } else {
    nx = -tangent.y;
    ny =  tangent.x;
    if (ny > 0) { nx = -nx; ny = -ny; }
  }
  const lx = point.x + nx * PULSE_LABEL_NORMAL_PX;
  const ly = point.y + ny * PULSE_LABEL_NORMAL_PX;
  // Label opacity keyed to label's own arc progress, not dot's:
  // label sits PULSE_DASH_PX/2 ahead, so sharing the dot's envelope
  // makes the label fade while it's still short of the arrow tip.
  const labelOverall = labelArcSvg / svgArc;
  const labelOpacity =
    labelOverall < 0.05 ? Math.max(0, labelOverall / 0.05) :
    labelOverall < 0.95 ? 1 :
    Math.max(0, (1 - labelOverall) / 0.05);
  return { point, tangent, nx, ny, lx, ly, labelOpacity };
}

export function dotOpacity(overall: number): number {
  return overall < 0.05 ? Math.max(0, overall / 0.05) :
    overall < 0.95 ? 1 :
    Math.max(0, (1 - overall) / 0.05);
}
