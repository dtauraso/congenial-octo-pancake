// Per-emitter-node-type animation rules. Each rule controls the
// pulse lifecycle clock (durationMs), how completion is decided
// (renderer-or-timer race vs timer-only), and how many simultaneous
// visual pulses an edge is allowed to render before the renderer
// coalesces (the simulator-side lifecycle still balances regardless).
//
// Why per-type: a single global PULSE_DEFAULT_DURATION_MS forced the
// simulator clock and the visual clock to coincide. On long-arc edges
// (e.g. feedback-ack routes) the visual takes ~10s while the
// simulator frees the slot every 2s, producing visual stacking and
// frame stalls. Different emitters have different semantic durations:
// a ReadGate ack should arrive quickly, a ChainInhibitor cascade can
// dwell, a StreakDetector signal lives between. Rules let each
// emitter type set its own clock.
//
// See contracts.md: C6 (lifecycle balance), C7 (renderer-or-timer
// race), C8 (coalesce keeps lifecycle balanced).

export type PulseCompletion = "timer" | "renderer-or-timer";

export type NodeAnimationRule = {
  durationMs: number;
  completion: PulseCompletion;
  maxConcurrentPerEdge: number;
};

export const DEFAULT_RULE: NodeAnimationRule = {
  durationMs: 2000,
  completion: "renderer-or-timer",
  maxConcurrentPerEdge: 1,
};

// Initial calibration. Tune per-type as friction surfaces. The cap
// is set to 1 universally for now — the renderer-or-timer race lets
// fast edges complete naturally and the timer fallback caps slow
// edges, so visual stacking should be a non-issue at cap=1.
export const NODE_ANIMATION_RULES: Record<string, NodeAnimationRule> = {
  Input: { durationMs: 1500, completion: "renderer-or-timer", maxConcurrentPerEdge: 1 },
  ReadLatch: { durationMs: 1500, completion: "renderer-or-timer", maxConcurrentPerEdge: 1 },
  ChainInhibitor: { durationMs: 2500, completion: "renderer-or-timer", maxConcurrentPerEdge: 1 },
  InhibitRightGate: { durationMs: 2000, completion: "renderer-or-timer", maxConcurrentPerEdge: 1 },
  DetectorLatch: { durationMs: 1500, completion: "renderer-or-timer", maxConcurrentPerEdge: 1 },
  StreakBreakDetector: { durationMs: 2000, completion: "renderer-or-timer", maxConcurrentPerEdge: 1 },
  StreakDetector: { durationMs: 2000, completion: "renderer-or-timer", maxConcurrentPerEdge: 1 },
  AndGate: { durationMs: 1500, completion: "renderer-or-timer", maxConcurrentPerEdge: 1 },
  PatternAnd: { durationMs: 1500, completion: "renderer-or-timer", maxConcurrentPerEdge: 1 },
  SyncGate: { durationMs: 1500, completion: "renderer-or-timer", maxConcurrentPerEdge: 1 },
  ReadGate: { durationMs: 1500, completion: "renderer-or-timer", maxConcurrentPerEdge: 1 },
  EdgeNode: { durationMs: 1500, completion: "renderer-or-timer", maxConcurrentPerEdge: 1 },
  Partition: { durationMs: 2000, completion: "renderer-or-timer", maxConcurrentPerEdge: 1 },
};

export function ruleForNodeType(t: string | undefined): NodeAnimationRule {
  if (!t) return DEFAULT_RULE;
  return NODE_ANIMATION_RULES[t] ?? DEFAULT_RULE;
}

import { state } from "./_state";

export function ruleForNodeId(nodeId: string): NodeAnimationRule {
  const t = state.spec?.nodes.find((n) => n.id === nodeId)?.type;
  return ruleForNodeType(t);
}
