// Drag-to-move port position logic for PortRim.
// Pure computation (snap points, nearest, drag handlers) — no React.

export type Side = "left" | "right" | "top" | "bottom";

export interface SnapPoint { side: Side; slot: 0 | 1 | 2; x: number; y: number }

export interface ActiveDrag {
  portName: string;
  isInput: boolean;
  oldSide: Side;
  oldSlot: 0 | 1 | 2;
  nearestSide: Side;
  nearestSlot: 0 | 1 | 2;
}

// 3 evenly-spaced snap slots: 25%, 50%, 75%
export const SLOT_PCT: [number, number, number] = [25, 50, 75];

export function slotPct(s: 0 | 1 | 2): number { return SLOT_PCT[s]; }

export function resolvePositions(ports: { slot?: 0 | 1 | 2 }[]): number[] {
  const total = ports.length;
  if (total <= 3) {
    const claimed = new Map<number, number>();
    for (let i = 0; i < ports.length; i++) {
      const s = ports[i].slot;
      if (s !== undefined) claimed.set(s, i);
    }
    const result = new Array<number>(total);
    const available = ([0, 1, 2] as const).filter((s) => !claimed.has(s));
    let avIdx = 0;
    for (let i = 0; i < ports.length; i++) {
      const s = ports[i].slot;
      if (s !== undefined) {
        result[i] = slotPct(s);
      } else {
        result[i] = slotPct(available[avIdx++] ?? 1);
      }
    }
    return result;
  }
  return ports.map((_, i) => ((i + 1) * 100) / (total + 1));
}

export function computeSnapPoints(rect: DOMRect, w: number, h: number): SnapPoint[] {
  const pts: SnapPoint[] = [];
  const sides: Side[] = ["left", "right", "top", "bottom"];
  for (const side of sides) {
    for (let slot = 0 as 0 | 1 | 2; slot <= 2; slot = (slot + 1) as 0 | 1 | 2) {
      const pct = SLOT_PCT[slot] / 100;
      let x: number, y: number;
      if (side === "left")        { x = rect.left; y = rect.top + pct * h; }
      else if (side === "right")  { x = rect.right; y = rect.top + pct * h; }
      else if (side === "top")    { x = rect.left + pct * w; y = rect.top; }
      else                        { x = rect.left + pct * w; y = rect.bottom; }
      pts.push({ side, slot, x, y });
    }
  }
  return pts;
}

export function nearestSnap(pts: SnapPoint[], cx: number, cy: number): SnapPoint {
  let best = pts[0]; let bestD = Infinity;
  for (const p of pts) {
    const d = (p.x - cx) ** 2 + (p.y - cy) ** 2;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

export function pctToSlot(pct: number): 0 | 1 | 2 {
  if (pct <= 30) return 0;
  if (pct <= 62) return 1;
  return 2;
}
