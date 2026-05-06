// Contract C6 (updated): pulse lifecycle duration is governed by the
// emitter node type's animation rule. Rules carry a per-type
// speedPxPerMs (with min/max clamps); the timer fallback at arm time
// is REF_EDGE_LENGTH_PX / effectiveSpeed (clamped). The renderer's
// PulseInstance later calls extendPulse with the real arc length so
// the simulator clock tracks visible traversal time.
//
// See docs/planning/visual-editor/contracts.md C6 and
// src/sim/runner/node-animation-rules.ts.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { notify } from "../../src/sim/event-bus";
import { state } from "../../src/sim/runner/_state";
import {
  installPulseLifetimes,
  uninstallPulseLifetimes,
} from "../../src/sim/runner/pulse-lifetimes";
import {
  NODE_ANIMATION_RULES, DEFAULT_RULE,
  durationForLength, REF_EDGE_LENGTH_PX,
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

describe("contract C6: pulse-duration-per-node-type", () => {
  it("ChainInhibitor uses its rule duration (not the default)", () => {
    state.spec = specWith([{ id: "a", type: "ChainInhibitor" }]);
    const dur = durationForLength(NODE_ANIMATION_RULES.ChainInhibitor, REF_EDGE_LENGTH_PX);
    notify({
      type: "emit", edgeId: "e1", fromNodeId: "a", toNodeId: "b",
      value: 1, tick: 0, pulseId: "pc1",
    });
    expect(state.activeAnimations).toBe(1);
    vi.advanceTimersByTime(dur - 1);
    expect(state.activeAnimations).toBe(1);
    vi.advanceTimersByTime(2);
    expect(state.activeAnimations).toBe(0);
  });

  it("ReadGate uses its (faster) rule speed", () => {
    state.spec = specWith([{ id: "a", type: "ReadGate" }]);
    const dur = durationForLength(NODE_ANIMATION_RULES.ReadGate, REF_EDGE_LENGTH_PX);
    notify({
      type: "emit", edgeId: "e1", fromNodeId: "a", toNodeId: "b",
      value: 1, tick: 0, pulseId: "pr1",
    });
    vi.advanceTimersByTime(dur - 1);
    expect(state.activeAnimations).toBe(1);
    vi.advanceTimersByTime(2);
    expect(state.activeAnimations).toBe(0);
  });

  it("unknown node type falls back to DEFAULT_RULE", () => {
    state.spec = specWith([{ id: "a", type: "NotARealType" }]);
    const dur = durationForLength(DEFAULT_RULE, REF_EDGE_LENGTH_PX);
    notify({
      type: "emit", edgeId: "e1", fromNodeId: "a", toNodeId: "b",
      value: 1, tick: 0, pulseId: "pd1",
    });
    vi.advanceTimersByTime(dur - 1);
    expect(state.activeAnimations).toBe(1);
    vi.advanceTimersByTime(2);
    expect(state.activeAnimations).toBe(0);
  });
});
