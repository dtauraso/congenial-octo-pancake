// Fixture A: Input → ReadLatch → ChainInhibitor — routing through edges,
// ReadLatch buffers `in`, fires on `release`.

import { describe, expect, it } from "vitest";
import { runToQuiescent } from "../../src/sim/simulator";
import type { Spec } from "../../src/schema";
import { edge, fireSummary } from "./_helpers";

const fixtureA: Spec = {
  nodes: [
    { id: "in", type: "Input", x: 0, y: 0 },
    { id: "rl", type: "ReadLatch", x: 1, y: 0 },
    { id: "ci", type: "ChainInhibitor", x: 2, y: 0 },
  ],
  edges: [
    edge("inToRl", "in", "out", "rl", "in", "chain"),
    edge("rlToCi", "rl", "out", "ci", "in", "chain"),
  ],
  timing: {
    steps: [],
    seed: [
      { nodeId: "in", outPort: "out", value: 5, atTick: 0 },
      { nodeId: "rl", outPort: "release", value: 1, atTick: 1 },
    ],
  },
};

describe("simulator: Input → ReadLatch → ChainInhibitor (fixture A)", () => {
  it("propagates the seed value through the chain", () => {
    // The release seed targets rl.release directly — represent that as a
    // self-edge so the seed routing finds it.
    const spec: Spec = {
      ...fixtureA,
      edges: [
        ...fixtureA.edges,
        edge("releaseInjector", "rl", "release", "rl", "release", "release"),
      ],
    };
    const final = runToQuiescent(spec);
    const fires = fireSummary(final);
    expect(fires).toContainEqual(["rl", "in", 5]);
    expect(fires).toContainEqual(["rl", "release", 1]);
    expect(fires).toContainEqual(["ci", "in", 5]);
    const ciState = final.state.ci;
    expect(ciState.held).toBe(5);
  });
});
