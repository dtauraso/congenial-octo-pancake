// Contract C9: uniform pulse traversal speed.
//
// Every emitter type's pulses traverse the screen at the same visual
// rate. Per-type animation rules differ only in completion mode,
// timer clamps (min/max), and concurrency cap — never in speed.
// Long edges take longer; the rate is invariant.
//
// This contract was added after a regression where per-type
// speedPxPerMs caused ChainInhibitor pulses to crawl while ReadGate
// pulses zipped on the same canvas. Distance-aware timing makes
// per-type speed unnecessary, and the inconsistency was visually
// jarring.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { notify } from "../../src/sim/event-bus";
import { state } from "../../src/sim/runner/_state";
import {
  installPulseLifetimes,
  uninstallPulseLifetimes,
} from "../../src/sim/runner/pulse-lifetimes";
import {
  NODE_ANIMATION_RULES, DEFAULT_RULE,
  effectiveSpeedPxPerMs, durationForLength, pulseSpeedPxPerMs,
} from "../../src/sim/runner/node-animation-rules";
import type { Spec } from "../../src/schema";

function specWith(nodes: Array<{ id: string; type: string }>): Spec {
  return { nodes: nodes.map((n) => ({ id: n.id, type: n.type })), edges: [] };
}

beforeEach(() => {
  vi.useFakeTimers();
  state.activeAnimations = 0;
  state.activeAnimationsByEdge = {};
  state.spec = null;
  installPulseLifetimes();
});

afterEach(() => {
  uninstallPulseLifetimes();
  state.spec = null;
  vi.useRealTimers();
});

describe("contract C9: uniform pulse speed across emitter types", () => {
  it("effectiveSpeedPxPerMs is identical for every registered rule", () => {
    const baseline = pulseSpeedPxPerMs();
    expect(baseline).toBeGreaterThan(0);
    expect(effectiveSpeedPxPerMs(DEFAULT_RULE)).toBe(baseline);
    for (const [type, rule] of Object.entries(NODE_ANIMATION_RULES)) {
      expect(effectiveSpeedPxPerMs(rule), `type=${type}`).toBe(baseline);
    }
  });

  it("durationForLength agrees across emitter types for the same length", () => {
    const L = 600;
    const baseline = durationForLength(DEFAULT_RULE, L);
    for (const [type, rule] of Object.entries(NODE_ANIMATION_RULES)) {
      expect(durationForLength(rule, L), `type=${type}`).toBe(baseline);
    }
  });

  it("rule shape carries no per-type speed field", () => {
    // If a future change re-introduces per-type speed it should fail
    // here, forcing the author to revisit C9. Static assertion via
    // runtime shape: the only numeric knobs allowed are min/max clamps
    // and the concurrency cap.
    for (const rule of Object.values(NODE_ANIMATION_RULES)) {
      expect(Object.keys(rule).sort()).toEqual(
        ["completion", "maxConcurrentPerEdge", "maxMs", "minMs"],
      );
      expect("speedPxPerMs" in rule).toBe(false);
    }
  });

  it("two emitter types on equal-length edges produce equal lifecycle timers", () => {
    // Integration test: notify two emits from different node types,
    // both armed against the same reference edge length. Their timer
    // fallbacks must fire on the same tick.
    state.spec = specWith([
      { id: "fast", type: "ReadGate" },
      { id: "slow", type: "ChainInhibitor" },
    ]);
    notify({
      type: "emit", edgeId: "e-fast", fromNodeId: "fast", toNodeId: "x",
      value: 1, tick: 0, pulseId: "u-fast",
    });
    notify({
      type: "emit", edgeId: "e-slow", fromNodeId: "slow", toNodeId: "y",
      value: 1, tick: 0, pulseId: "u-slow",
    });
    expect(state.activeAnimations).toBe(2);
    const dur = durationForLength(DEFAULT_RULE, 400);
    vi.advanceTimersByTime(dur - 1);
    expect(state.activeAnimations).toBe(2);
    vi.advanceTimersByTime(2);
    expect(state.activeAnimations).toBe(0);
  });
});
