// Contract C6: pulse-lifetime-view-agnostic.
//
// Every notify({type:"emit"}) registers exactly one Pulse lifetime.
// noteEdgePulseStarted fires at registration and noteEdgePulseEnded
// fires after the lifetime's duration, INDEPENDENT of whether any
// renderer (AnimatedEdge / fold-halo / future view modes) is
// subscribed.
//
// Why this contract: the pulse-leak-investigation (May 2026) found
// the simulator's edge-slot release machinery livelocking when the
// fold-halo collapsed an edge — no AnimatedEdge mounted, so the
// PulseInstance that previously owned noteEdgePulseStarted/Ended
// never mounted, animEnded never flipped, the slot stayed held
// forever, and the readGate's chainIn declined indefinitely waiting
// for an ack that couldn't arrive. Lifting the lifecycle out of
// React mount makes this bug class structurally unrepresentable.
//
// See docs/planning/visual-editor/contracts.md C6 entry.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { notify } from "../../src/sim/event-bus";
import { state } from "../../src/sim/runner/_state";
import {
  installPulseLifetimes,
  uninstallPulseLifetimes,
  PULSE_DEFAULT_DURATION_MS,
} from "../../src/sim/runner/pulse-lifetimes";

beforeEach(() => {
  vi.useFakeTimers();
  state.activeAnimations = 0;
  state.activeAnimationsByEdge = {};
  installPulseLifetimes();
});

afterEach(() => {
  uninstallPulseLifetimes();
  vi.useRealTimers();
});

describe("contract C6: pulse-lifetime-view-agnostic", () => {
  it("emit registers a lifetime and fires started immediately", () => {
    notify({
      type: "emit",
      edgeId: "e1",
      fromNodeId: "a",
      toNodeId: "b",
      value: 1,
      tick: 0,
      pulseId: "test-p1",
    });
    expect(state.activeAnimations).toBe(1);
    expect(state.activeAnimationsByEdge.e1).toBe(1);
  });

  it("ended fires after the default duration with no renderer mounted", () => {
    notify({
      type: "emit", edgeId: "e1", fromNodeId: "a", toNodeId: "b",
      value: 1, tick: 0, pulseId: "test-p2",
    });
    expect(state.activeAnimations).toBe(1);
    vi.advanceTimersByTime(PULSE_DEFAULT_DURATION_MS - 1);
    expect(state.activeAnimations).toBe(1);
    vi.advanceTimersByTime(2);
    expect(state.activeAnimations).toBe(0);
    expect(state.activeAnimationsByEdge.e1).toBeUndefined();
  });

  it("two emits on the same edge produce two balanced lifetimes", () => {
    notify({ type: "emit", edgeId: "e1", fromNodeId: "a", toNodeId: "b", value: 1, tick: 0, pulseId: "test-p3a" });
    notify({ type: "emit", edgeId: "e1", fromNodeId: "a", toNodeId: "b", value: 2, tick: 1, pulseId: "test-p3b" });
    expect(state.activeAnimations).toBe(2);
    expect(state.activeAnimationsByEdge.e1).toBe(2);
    vi.advanceTimersByTime(PULSE_DEFAULT_DURATION_MS + 1);
    expect(state.activeAnimations).toBe(0);
    expect(state.activeAnimationsByEdge.e1).toBeUndefined();
  });

  it("non-emit events do not register lifetimes", () => {
    notify({
      type: "fire", nodeId: "a", inputPort: "in",
      inputValue: 1, tick: 0, ord: 0,
    });
    expect(state.activeAnimations).toBe(0);
  });
});
