// Contract C8: visual concurrency cap does NOT desynchronise the
// simulator-side lifecycle ledger. When the renderer coalesces (drops)
// an emit because it already has rule.maxConcurrentPerEdge pulses
// rendering on that edge, pulse-lifetimes still registers a balanced
// noteEdgePulseStarted/Ended pair so state.activeAnimations and
// state.activeAnimationsByEdge stay correct for slot-release accounting.
//
// Equivalently: N emit notifications produce N matched start/end pairs
// in the simulator's ledger regardless of how many pulses the renderer
// chose to draw.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { notify } from "../../src/sim/event-bus";
import { state } from "../../src/sim/runner/_state";
import {
  installPulseLifetimes,
  uninstallPulseLifetimes,
} from "../../src/sim/runner/pulse-lifetimes";
import {
  tryClaimVisualSlot,
  visualSlotCount,
  _resetPulseConcurrency,
} from "../../src/sim/runner/pulse-concurrency";
import { DEFAULT_RULE } from "../../src/sim/runner/node-animation-rules";

beforeEach(() => {
  vi.useFakeTimers();
  state.activeAnimations = 0;
  state.activeAnimationsByEdge = {};
  state.spec = null;
  _resetPulseConcurrency();
  installPulseLifetimes();
});

afterEach(() => {
  uninstallPulseLifetimes();
  vi.useRealTimers();
});

describe("contract C8: pulse-coalesce-balanced", () => {
  it("N emits register N balanced lifecycles even when renderer caps at 1", () => {
    // Simulate the renderer claiming the only visual slot on e1.
    expect(tryClaimVisualSlot("e1", 1)).toBe(true);
    expect(visualSlotCount("e1")).toBe(1);
    // Three more emits arrive while the visual is busy — renderer
    // would skip rendering them (tryClaimVisualSlot would return false),
    // but the simulator ledger must still see all four lifecycles.
    for (let i = 0; i < 4; i++) {
      notify({
        type: "emit", edgeId: "e1", fromNodeId: "a", toNodeId: "b",
        value: i, tick: i, pulseId: `pco-${i}`,
      });
    }
    expect(state.activeAnimations).toBe(4);
    expect(state.activeAnimationsByEdge.e1).toBe(4);
    vi.advanceTimersByTime(DEFAULT_RULE.durationMs + 1);
    expect(state.activeAnimations).toBe(0);
    expect(state.activeAnimationsByEdge.e1).toBeUndefined();
  });

  it("visual slot ledger is independent of simulator ledger", () => {
    // Visual slot fills to cap=1; further claims fail without
    // affecting state.activeAnimationsByEdge.
    expect(tryClaimVisualSlot("e2", 1)).toBe(true);
    expect(tryClaimVisualSlot("e2", 1)).toBe(false);
    expect(state.activeAnimationsByEdge.e2 ?? 0).toBe(0);
  });
});
