// Integration: drive the real simulator and assert the queue-based
// halo predicate (`foldHasPendingEvents`) tracks data residence —
// off at idle, on while pulses are in flight toward members, off after
// the cascade drains.

import { describe, expect, it } from "vitest";
import { initWorld, step, type World } from "../src/sim/simulator";
import type { Spec } from "../src/schema";
import { foldHasPendingEvents } from "../src/webview/rf/fold-activity";

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

function drain(spec: Spec, w: World, maxSteps = 50): World {
  for (let i = 0; i < maxSteps; i++) {
    const before = w.history.length;
    w = step(spec, w);
    if (w.history.length === before) break;
  }
  return w;
}

describe("fold-halo predicate vs live simulator", () => {
  const memberIds = ["ci1", "ci2"];

  it("turns on while pulses are pending for members", () => {
    let world = initWorld(cascadeSpec);
    let sawOn = false;
    for (let i = 0; i < 20; i++) {
      const before = world.history.length;
      world = step(cascadeSpec, world);
      if (foldHasPendingEvents(memberIds, world)) sawOn = true;
      if (world.history.length === before) break;
    }
    expect(sawOn).toBe(true);
  });

  it("off after the cascade drains", () => {
    const world = drain(cascadeSpec, initWorld(cascadeSpec));
    expect(foldHasPendingEvents(memberIds, world)).toBe(false);
  });
});
