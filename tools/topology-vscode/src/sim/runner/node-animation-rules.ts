// Per-emitter-node-type animation rules. Each rule controls how
// completion is decided (renderer-or-timer race vs timer-only), the
// timer's min/max clamp on long/short edges, and how many simultaneous
// visual pulses an edge is allowed to render before the renderer
// coalesces (the simulator-side lifecycle still balances regardless).
//
// Distance-aware: traversal speed is a single global (PULSE_SPEED_PX_PER_MS
// at REF_TICK_MS) so every edge moves at the same visual rate; long
// edges simply take longer. The timer fallback at arm time is
// REF_EDGE_LENGTH_PX / effectiveSpeed clamped to [minMs, maxMs];
// PulseInstance corrects via extendPulse with the real arc once
// mounted, and again on geom/speed changes (node drag).
//
// See contracts.md: C6 (lifecycle balance), C7 (renderer-or-timer
// race), C8 (coalesce keeps lifecycle balanced).

import { getTickMs } from "./load";
import { state } from "./_state";

export type PulseCompletion = "timer" | "renderer-or-timer";

export type NodeAnimationRule = {
  minMs: number;
  maxMs: number;
  completion: PulseCompletion;
  maxConcurrentPerEdge: number;
};

const REF_TICK_MS = 400;
// Single global traversal speed at REF_TICK_MS. All pulses traverse
// at this rate; per-type variation lives in clamps, not speed.
const PULSE_SPEED_PX_PER_MS = 0.08;

// Reference edge length used when no renderer has reported a real arc
// yet (folded/headless edges, or the brief window before PulseInstance
// mounts and calls extendPulse).
export const REF_EDGE_LENGTH_PX = 400;

const DEFAULT_MIN_MS = 600;
const DEFAULT_MAX_MS = 12000;

function rule(overrides: Partial<NodeAnimationRule> = {}): NodeAnimationRule {
  return {
    minMs: DEFAULT_MIN_MS,
    maxMs: DEFAULT_MAX_MS,
    completion: "renderer-or-timer",
    maxConcurrentPerEdge: 1,
    ...overrides,
  };
}

export const DEFAULT_RULE: NodeAnimationRule = rule();

export const NODE_ANIMATION_RULES: Record<string, NodeAnimationRule> = {
  Input: rule(),
  ReadLatch: rule(),
  ChainInhibitor: rule(),
  InhibitRightGate: rule(),
  DetectorLatch: rule(),
  StreakBreakDetector: rule(),
  StreakDetector: rule(),
  AndGate: rule(),
  PatternAnd: rule(),
  SyncGate: rule(),
  ReadGate: rule(),
  EdgeNode: rule(),
  Partition: rule(),
};

export function ruleForNodeType(t: string | undefined): NodeAnimationRule {
  if (!t) return DEFAULT_RULE;
  return NODE_ANIMATION_RULES[t] ?? DEFAULT_RULE;
}

export function ruleForNodeId(nodeId: string): NodeAnimationRule {
  const t = state.spec?.nodes.find((n) => n.id === nodeId)?.type;
  return ruleForNodeType(t);
}

export function pulseSpeedPxPerMs(): number {
  return (REF_TICK_MS / getTickMs()) * PULSE_SPEED_PX_PER_MS;
}

// Back-compat: callers used to take a rule and read its speed; the
// global is now the source of truth, but the signature stays so call
// sites don't all churn. Rule arg is unused.
export function effectiveSpeedPxPerMs(_r?: NodeAnimationRule): number {
  return pulseSpeedPxPerMs();
}

export function durationForLength(
  r: NodeAnimationRule,
  edgeLengthPx: number,
): number {
  const raw = edgeLengthPx / pulseSpeedPxPerMs();
  return Math.max(r.minMs, Math.min(r.maxMs, raw));
}
