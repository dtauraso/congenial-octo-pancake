// Contract C7: renderer-or-timer race for pulse completion.
//
// A pulse's lifecycle ends when EITHER the renderer signals arc
// completion (signalRendererComplete) OR the rule's timer fires —
// whichever comes first. The loser is a no-op so noteEdgePulseEnded
// fires exactly once per started pulse.
//
// Why: visual fidelity (PulseInstance traversing its arc) without
// re-coupling correctness to React mount. Folded/headless edges
// fall back to the timer; mounted edges complete in real arc time.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { notify } from "../../src/sim/event-bus";
import { state } from "../../src/sim/runner/_state";
import {
  installPulseLifetimes,
  uninstallPulseLifetimes,
} from "../../src/sim/runner/pulse-lifetimes";
import { signalRendererComplete } from "../../src/sim/runner/pulse-completion";
import {
  DEFAULT_RULE, durationForLength, REF_EDGE_LENGTH_PX,
} from "../../src/sim/runner/node-animation-rules";

const DEFAULT_DURATION = durationForLength(DEFAULT_RULE, REF_EDGE_LENGTH_PX);

beforeEach(() => {
  vi.useFakeTimers();
  state.activeAnimations = 0;
  state.activeAnimationsByEdge = {};
  state.spec = null;
  installPulseLifetimes();
});

afterEach(() => {
  uninstallPulseLifetimes();
  vi.useRealTimers();
});

describe("contract C7: pulse-renderer-or-timer", () => {
  it("renderer signal ends lifecycle before timer would fire", () => {
    notify({
      type: "emit", edgeId: "e1", fromNodeId: "a", toNodeId: "b",
      value: 1, tick: 0, pulseId: "pr-a",
    });
    expect(state.activeAnimations).toBe(1);
    // Advance partway, then signal renderer complete.
    vi.advanceTimersByTime(200);
    signalRendererComplete("pr-a");
    expect(state.activeAnimations).toBe(0);
    // Timer firing later must NOT double-decrement.
    vi.advanceTimersByTime(DEFAULT_DURATION + 100);
    expect(state.activeAnimations).toBe(0);
  });

  it("timer ends lifecycle when no renderer signal arrives", () => {
    notify({
      type: "emit", edgeId: "e1", fromNodeId: "a", toNodeId: "b",
      value: 1, tick: 0, pulseId: "pr-b",
    });
    vi.advanceTimersByTime(DEFAULT_DURATION + 1);
    expect(state.activeAnimations).toBe(0);
  });

  it("late renderer signal after timer fired is a no-op", () => {
    notify({
      type: "emit", edgeId: "e1", fromNodeId: "a", toNodeId: "b",
      value: 1, tick: 0, pulseId: "pr-c",
    });
    vi.advanceTimersByTime(DEFAULT_DURATION + 1);
    expect(state.activeAnimations).toBe(0);
    signalRendererComplete("pr-c");
    expect(state.activeAnimations).toBe(0);
  });
});
