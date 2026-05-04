// Integration test: drive the real simulator over a small spec, route
// member fires into the activity tracker, and assert the halo timeline
// matches the spec the user gave:
//   - on at first member fire
//   - on continuously while members keep firing within the decay window
//   - off after decay-window of silence
//
// This catches regressions in the seam between the simulator's fire
// stream and the fold-halo tracker — neither side can drift without
// breaking this contract.

import { describe, expect, it, vi } from "vitest";
import { initWorld, step, type World } from "../src/sim/simulator";
import type { Spec } from "../src/schema";
import { createFoldActivityTracker } from "../src/webview/rf/fold-activity";

function makeFakeTimer() {
  let now = 0;
  type Pending = { at: number; fn: () => void; cancelled: boolean };
  const pending: Pending[] = [];
  let nextHandle = 1;
  const handles = new Map<number, Pending>();
  return {
    set: (fn: () => void, ms: number) => {
      const handle = nextHandle++;
      const entry = { at: now + ms, fn, cancelled: false };
      pending.push(entry);
      handles.set(handle, entry);
      return handle;
    },
    clear: (h: unknown) => {
      const entry = handles.get(h as number);
      if (entry) entry.cancelled = true;
    },
    advance(ms: number) {
      now += ms;
      pending
        .filter((p) => !p.cancelled && p.at <= now)
        .sort((a, b) => a.at - b.at)
        .forEach((p) => {
          p.cancelled = true;
          p.fn();
        });
    },
  };
}

// ChainInhibitor cascade: inA → ci1 → ci2. ci1 + ci2 are the fold's
// members; inA is outside. Seeding one pulse drives a couple of fires
// through the members.
const cascadeSpec: Spec = {
  nodes: [
    { id: "inA", type: "Input", x: 0, y: 0 },
    { id: "ci1", type: "ChainInhibitor", x: 1, y: 0 },
    { id: "ci2", type: "ChainInhibitor", x: 2, y: 0 },
  ],
  edges: [
    { id: "inAToCi1", source: "inA", sourceHandle: "out", target: "ci1", targetHandle: "in", kind: "chain" },
    { id: "ci1ToCi2", source: "ci1", sourceHandle: "out", target: "ci2", targetHandle: "in", kind: "chain" },
  ],
  timing: {
    steps: [],
    seed: [{ nodeId: "inA", outPort: "out", value: 1, atTick: 0 }],
  },
};

function drive(world: World, ticks: number): World {
  let w = world;
  for (let i = 0; i < ticks; i++) w = step(cascadeSpec, w);
  return w;
}

describe("fold-halo integration: simulator → activity tracker", () => {
  const memberIds = new Set(["ci1", "ci2"]);

  it("activates on first member fire from the live simulator", () => {
    const t = makeFakeTimer();
    const onChange = vi.fn();
    const tracker = createFoldActivityTracker(600, onChange, t);
    let w = initWorld(cascadeSpec);

    // Simulator emits a fire for ci1 during step(). Feed member fires
    // into the tracker exactly the way the FoldNode hook does.
    const before = w.history.length;
    w = step(cascadeSpec, w);
    const memberFires = w.history.slice(before).filter((h) => memberIds.has(h.nodeId));
    expect(memberFires.length).toBeGreaterThan(0);
    memberFires.forEach(() => tracker.noteFire());
    expect(tracker.isActive()).toBe(true);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("stays on across the cascade without flickering", () => {
    const t = makeFakeTimer();
    const onChange = vi.fn();
    const tracker = createFoldActivityTracker(600, onChange, t);
    let w = initWorld(cascadeSpec);

    // Drive ticks while fires are still coming. Advance only 400ms per
    // tick so the decay never trips between fires.
    for (let tick = 0; tick < 5; tick++) {
      const before = w.history.length;
      w = step(cascadeSpec, w);
      const memberFires = w.history.slice(before).filter((h) => memberIds.has(h.nodeId));
      if (memberFires.length === 0) break;
      memberFires.forEach(() => tracker.noteFire());
      expect(tracker.isActive()).toBe(true);
      t.advance(400);
    }
    // Through the firing portion, exactly one transition (off→on) and
    // no flicker.
    const calls = onChange.mock.calls.map((c) => c[0]);
    expect(calls).toEqual([true]);
  });

  it("decays off when the simulator stops feeding member fires", () => {
    const t = makeFakeTimer();
    const onChange = vi.fn();
    const tracker = createFoldActivityTracker(600, onChange, t);
    let w = initWorld(cascadeSpec);

    // Drain the cascade until quiescent.
    let drained = false;
    for (let i = 0; i < 20 && !drained; i++) {
      const before = w.history.length;
      w = step(cascadeSpec, w);
      const memberFires = w.history.slice(before).filter((h) => memberIds.has(h.nodeId));
      memberFires.forEach(() => tracker.noteFire());
      if (w.history.length === before) drained = true;
      t.advance(100);
    }
    expect(tracker.isActive()).toBe(true);

    // No more fires; advance past the decay window. Halo turns off.
    t.advance(700);
    expect(tracker.isActive()).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith(false);
  });
});
