import type { ArrowStyle, EdgeKind, EdgeRoute } from "../../../schema";
import { getTickMs } from "../../../sim/runner";

const MAX_RIDING_LABEL_CHARS = 8;
export function formatRidingValue(v: unknown): string {
  if (typeof v === "number") return String(v);
  const s = String(v);
  return s.length > MAX_RIDING_LABEL_CHARS
    ? s.slice(0, MAX_RIDING_LABEL_CHARS) + "…"
    : s;
}

export type EdgeData = {
  kind?: EdgeKind;
  route?: EdgeRoute;
  lane?: number;
  arrowStyle?: ArrowStyle;
  valueLabel?: string;
  label?: string;
};

// Single named knob for traversal speed. Everything visual scales
// from this — there is no per-edge tuning, no per-route correction,
// no separate dot/label timing. The dot's on-screen speed is exactly
// this rate measured along the path arc, which is also the only
// thing the riding label tracks. Adjust here, not in callers.
const PULSE_PX_PER_MS_AT_REF_TICK = 0.08;
const REF_TICK_MS = 400;
// Visible dot length along the path arc. The dot is rendered as a
// dash window via strokeDasharray; the riding label reads its
// midpoint along the same arc so dot and label trace one curve.
export const PULSE_DASH_PX = 20;
// Perpendicular distance from the path to the riding label, along
// the local normal at the dot's midpoint. Using the normal (not a
// fixed screen-y offset) keeps the label's track parallel to the
// dot's track on curves and diagonals.
export const PULSE_LABEL_NORMAL_PX = 10;
export function pulseSpeedPxPerMs(): number {
  return (REF_TICK_MS / getTickMs()) * PULSE_PX_PER_MS_AT_REF_TICK;
}

export type Pulse = {
  key: number;
  pulseId: string;
  value: string;
  // Sim time at which this emit fired. Captured under fix-a's
  // step-pinned simTime so every pulse from one logical step shares
  // an emit timestamp.
  simStart: number;
};
