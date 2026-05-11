// Edge path geometry for RSubstrateEdge. Three route variants —
// `line` (bezier via RF's control-point math), `snake` (mid-x dogleg
// with rounded corners), and `below` (drop into a corridor under
// both endpoints). Returns the SVG `d` string only; arc length is
// measured from the live <path> by <Wire>.

export type EdgeRoute = "line" | "snake" | "below";

function controlOffset(distance: number): number {
  return distance >= 0 ? 0.5 * distance : 0.25 * 25 * Math.sqrt(-distance);
}

type Pt = { x: number; y: number };

function controlPoint(pos: string, x1: number, y1: number, x2: number, y2: number): Pt {
  switch (pos) {
    case "left":   return { x: x1 - controlOffset(x1 - x2), y: y1 };
    case "right":  return { x: x1 + controlOffset(x2 - x1), y: y1 };
    case "top":    return { x: x1, y: y1 - controlOffset(y1 - y2) };
    case "bottom": return { x: x1, y: y1 + controlOffset(y2 - y1) };
    default:       return { x: x1, y: y1 };
  }
}

function snakeD(sx: number, sy: number, tx: number, ty: number, lane: number): string {
  const midX = (sx + tx) / 2 + lane;
  const r = Math.min(15, Math.abs(midX - sx) / 2, Math.abs(tx - midX) / 2, Math.abs(ty - sy) / 2);
  if (!(r > 0.5)) {
    return `M ${sx},${sy} L ${midX},${sy} L ${midX},${ty} L ${tx},${ty}`;
  }
  const sxDir = midX >= sx ? 1 : -1;
  const yDir  = ty   >= sy ? 1 : -1;
  const txDir = tx   >= midX ? 1 : -1;
  return (
    `M ${sx},${sy} ` +
    `L ${midX - sxDir * r},${sy} ` +
    `Q ${midX},${sy} ${midX},${sy + yDir * r} ` +
    `L ${midX},${ty - yDir * r} ` +
    `Q ${midX},${ty} ${midX + txDir * r},${ty} ` +
    `L ${tx},${ty}`
  );
}

function belowD(sx: number, sy: number, tx: number, ty: number, lane: number): string {
  const corridorY = Math.max(sy, ty) + 80 + lane;
  const r = Math.min(15, Math.abs(corridorY - sy) / 2, Math.abs(corridorY - ty) / 2, Math.abs(tx - sx) / 2);
  if (!(r > 0.5)) {
    return `M ${sx},${sy} L ${sx},${corridorY} L ${tx},${corridorY} L ${tx},${ty}`;
  }
  const xDir = tx >= sx ? 1 : -1;
  return (
    `M ${sx},${sy} ` +
    `L ${sx},${corridorY - r} ` +
    `Q ${sx},${corridorY} ${sx + xDir * r},${corridorY} ` +
    `L ${tx - xDir * r},${corridorY} ` +
    `Q ${tx},${corridorY} ${tx},${corridorY - r} ` +
    `L ${tx},${ty}`
  );
}

export function buildEdgePathD(
  route: EdgeRoute,
  sx: number, sy: number, sp: string,
  tx: number, ty: number, tp: string,
  lane: number,
): string {
  if (route === "snake") return snakeD(sx, sy, tx, ty, lane);
  if (route === "below") return belowD(sx, sy, tx, ty, lane);
  const c1 = controlPoint(sp, sx, sy, tx, ty);
  const c2 = controlPoint(tp, tx, ty, sx, sy);
  return `M ${sx},${sy} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${tx},${ty}`;
}

export function edgeMidpoint(
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
