// edge.data.delay overrides the emission's default delay; absent or
// invalid → fall back to the default.

import { describe, expect, it } from "vitest";
import { initWorld, step } from "../../src/sim/simulator";
import type { Edge, Spec } from "../../src/schema";
import { edge } from "./_helpers";

describe("simulator: per-edge data.delay", () => {
  it("delays delivery by edge.data.delay instead of the default", () => {
    const slow: Edge = {
      ...edge("inToRl", "in", "out", "rl", "in", "chain"),
      data: { delay: 7 },
    };
    const spec: Spec = {
      nodes: [
        { id: "in", type: "Input", x: 0, y: 0 },
        { id: "rl", type: "ReadLatch", x: 1, y: 0 },
      ],
      edges: [slow],
      timing: {
        seed: [{ nodeId: "in", outPort: "out", value: 1, atTick: 0 }],
      },
    };
    const w = initWorld(spec);
    // Seed schedules the edge with baseTick=0, defaultDelay=0 +
    // edge override 7 → readyAt should be 7.
    expect(w.queue[0].readyAt).toBe(7);
  });

  it("falls back to emission default when edge.data has no delay", () => {
    const spec: Spec = {
      nodes: [
        { id: "in", type: "Input", x: 0, y: 0 },
        { id: "rl", type: "ReadLatch", x: 1, y: 0 },
      ],
      edges: [edge("inToRl", "in", "out", "rl", "in", "chain")],
      timing: {
        seed: [{ nodeId: "in", outPort: "out", value: 1, atTick: 3 }],
      },
    };
    // atTick=3 is future-dated, so the seed sits in pendingSeeds rather
    // than the queue. One step advances tick to 3 and drains the seed
    // through scheduleEmission with baseTick=3 + defaultDelay=0.
    let w = initWorld(spec);
    expect(w.pendingSeeds.length).toBe(1);
    w = step(spec, w);
    expect(w.history[0]?.tick).toBe(3);
  });
});
