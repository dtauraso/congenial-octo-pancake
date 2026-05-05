import { NODE_TYPES, type Edge, type Node } from "../schema";
import { nodeById, spec, viewerState } from "./state";

export type EdgeGeom =
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number }
  | { kind: "path"; points: Array<[number, number]>; d: string };

export function nodeCenter(n: Node): { cx: number; cy: number; w: number; h: number } {
  const def = NODE_TYPES[n.type] ?? NODE_TYPES.Generic;
  const nv = viewerState.nodes?.[n.id];
  const x = nv?.x ?? 0;
  const y = nv?.y ?? 0;
  return { cx: x + def.width / 2, cy: y + def.height / 2, w: def.width, h: def.height };
}

export function maxBottom(): number {
  let m = 0;
  for (const n of spec.nodes) {
    const def = NODE_TYPES[n.type] ?? NODE_TYPES.Generic;
    const nv = viewerState.nodes?.[n.id];
    const y = nv?.y ?? 0;
    m = Math.max(m, y + def.height);
  }
  return m;
}

export function pathFromPoints(points: Array<[number, number]>): { kind: "path"; points: Array<[number, number]>; d: string } {
  const d = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  return { kind: "path", points, d };
}

export function edgeGeom(e: Edge): EdgeGeom | null {
  const s = nodeById.get(e.source);
  const t = nodeById.get(e.target);
  if (!s || !t) return null;
  const a = nodeCenter(s);
  const b = nodeCenter(t);
  if (e.kind === "feedback-ack") {
    const lane = maxBottom() + 30;
    const sy = (viewerState.nodes?.[s.id]?.y ?? 0) + a.h;
    const ty = (viewerState.nodes?.[t.id]?.y ?? 0) + b.h;
    return pathFromPoints([[a.cx, sy], [a.cx, lane], [b.cx, lane], [b.cx, ty]]);
  }
  if (e.kind === "inhibit-in") {
    const sTop = viewerState.nodes?.[s.id]?.y ?? 0;
    const tBot = (viewerState.nodes?.[t.id]?.y ?? 0) + b.h;
    const lane = (sTop + tBot) / 2;
    return pathFromPoints([[a.cx, sTop], [a.cx, lane], [b.cx, lane], [b.cx, tBot]]);
  }
  return { kind: "line", x1: a.cx, y1: a.cy, x2: b.cx, y2: b.cy };
}

export function pathLength(g: EdgeGeom): number {
  if (g.kind === "line") {
    return Math.hypot(g.x2 - g.x1, g.y2 - g.y1);
  }
  let len = 0;
  for (let i = 1; i < g.points.length; i++) {
    const [x1, y1] = g.points[i - 1];
    const [x2, y2] = g.points[i];
    len += Math.hypot(x2 - x1, y2 - y1);
  }
  return len;
}

export function labelAnchor(g: EdgeGeom | null): { x: number; y: number } {
  if (!g) return { x: 0, y: 0 };
  if (g.kind === "line") {
    return { x: (g.x1 + g.x2) / 2, y: (g.y1 + g.y2) / 2 };
  }
  let best = { x: 0, y: 0, len: -1 };
  for (let i = 1; i < g.points.length; i++) {
    const [x1, y1] = g.points[i - 1];
    const [x2, y2] = g.points[i];
    if (Math.abs(y1 - y2) < 0.5) {
      const len = Math.abs(x2 - x1);
      if (len > best.len) best = { x: (x1 + x2) / 2, y: y1, len };
    }
  }
  if (best.len >= 0) return { x: best.x, y: best.y };
  const [fx, fy] = g.points[0] ?? [0, 0];
  return { x: fx, y: fy };
}
