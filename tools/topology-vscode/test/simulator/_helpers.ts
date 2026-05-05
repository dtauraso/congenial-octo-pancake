// Shared fixtures + helpers for simulator/* test files. Keeps each
// per-describe test file under the file-size budget while letting
// fixtureB / fixtureC be referenced from multiple tests.

import type { Spec, Edge } from "../../src/schema";
import type { World } from "../../src/sim/simulator";

export function edge(
  id: string,
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string,
  kind: Edge["kind"] = "any",
): Edge {
  return { id, source, sourceHandle, target, targetHandle, kind };
}

export function fireSummary(
  w: World,
): Array<[string, string, number | string]> {
  return w.history.map((h) => [h.nodeId, h.inputPort, h.inputValue]);
}

// Fixture B: AndGate join — both inputs ignite simultaneously. Used by
// the AndGate describe, determinism (via C), cycle-counter, replayTo,
// and purity tests.
export const fixtureB: Spec = {
  nodes: [
    { id: "srcA", type: "Input", x: 0, y: 0 },
    { id: "srcB", type: "Input", x: 0, y: 1 },
    { id: "and", type: "AndGate", x: 1, y: 0 },
  ],
  edges: [
    edge("aIn", "srcA", "out", "and", "a", "signal"),
    edge("bIn", "srcB", "out", "and", "b", "signal"),
  ],
  timing: {
    steps: [],
    seed: [
      { nodeId: "srcA", outPort: "out", value: 1, atTick: 0 },
      { nodeId: "srcB", outPort: "out", value: 1, atTick: 0 },
    ],
  },
};

// Fixture C: SyncGate releases a DetectorLatch. Used by the SyncGate
// describe and by the determinism test.
export const fixtureC: Spec = {
  nodes: [
    { id: "src", type: "Input", x: 0, y: 0 },
    { id: "sigA", type: "Input", x: 0, y: 1 },
    { id: "sigB", type: "Input", x: 0, y: 2 },
    { id: "sg", type: "SyncGate", x: 1, y: 1 },
    { id: "dl", type: "DetectorLatch", x: 2, y: 0 },
  ],
  edges: [
    edge("srcToDl", "src", "out", "dl", "in", "chain"),
    edge("aToSg", "sigA", "out", "sg", "a", "signal"),
    edge("bToSg", "sigB", "out", "sg", "b", "signal"),
    edge("sgToDl", "sg", "release", "dl", "release", "release"),
  ],
  timing: {
    steps: [],
    seed: [
      { nodeId: "src", outPort: "out", value: 99, atTick: 0 },
      { nodeId: "sigA", outPort: "out", value: 1, atTick: 0 },
      { nodeId: "sigB", outPort: "out", value: 1, atTick: 0 },
    ],
  },
};
