// Single edge with slots:1 fed two pulses at tick 0. Without slot
// capacity, both arrive and the second overwrites the buffer; with
// slots:1, the second is held at the source until the first is
// consumed by a fire. Buffer-and-wait nodes (ReadGate) keep the slot
// occupied across the buffer phase.

import { describe, expect, it } from "vitest";
import { initWorld, step } from "../../src/sim/simulator";
import type { Edge, Spec } from "../../src/schema";
import { edge } from "./_helpers";

const slotEdge: Edge = {
  id: "inToCi",
  source: "in",
  sourceHandle: "out",
  target: "ci",
  targetHandle: "in",
  kind: "chain",
  data: { slots: 1 },
};
const spec: Spec = {
  nodes: [
    { id: "in", type: "Input", x: 0, y: 0 },
    { id: "ci", type: "ChainInhibitor", x: 1, y: 0 },
  ],
  edges: [slotEdge],
  timing: {
    seed: [
      { nodeId: "in", outPort: "out", value: 11, atTick: 0 },
      { nodeId: "in", outPort: "out", value: 22, atTick: 0 },
    ],
  },
};

describe("simulator: edge slot capacity (audit row #1)", () => {
  it("holds the second emission at the source until the first is consumed", () => {
    const w0 = initWorld(spec);
    expect(w0.queue.length).toBe(1);
    expect(w0.queue[0].value).toBe(11);
    expect(w0.edgePending.inToCi?.length ?? 0).toBe(1);
    expect(w0.edgePending.inToCi[0].value).toBe(22);
    expect(w0.edgeOccupancy.inToCi).toBe(1);
  });

  it("releases the held emission after the receiver fires", () => {
    let w = initWorld(spec);
    w = step(spec, w);
    expect(w.queue.some((e) => e.value === 22)).toBe(true);
    expect(w.edgePending.inToCi ?? []).toEqual([]);
    expect(w.edgeOccupancy.inToCi).toBe(1);
  });

  it("buffer-and-wait nodes keep the slot occupied until fire", () => {
    const rgSpec: Spec = {
      nodes: [
        { id: "in", type: "Input", x: 0, y: 0 },
        { id: "rg", type: "ReadGate", x: 1, y: 0 },
        { id: "sink", type: "ChainInhibitor", x: 2, y: 0 },
      ],
      edges: [
        {
          id: "inToRg",
          source: "in",
          sourceHandle: "out",
          target: "rg",
          targetHandle: "chainIn",
          kind: "chain",
          data: { slots: 1 },
        },
        edge("rgToSink", "rg", "out", "sink", "in", "chain"),
      ],
      timing: {
        seed: [
          { nodeId: "in", outPort: "out", value: 7, atTick: 0 },
          { nodeId: "in", outPort: "out", value: 8, atTick: 0 },
        ],
      },
    };
    let w = initWorld(rgSpec);
    w = step(rgSpec, w);
    expect(w.edgeOccupancy.inToRg).toBe(1);
    expect(w.edgePending.inToRg?.length).toBe(1);
    expect(w.nodeBufferedEdges.rg).toEqual(["inToRg"]);
    w.queue.push({
      id: w.nextId++,
      readyAt: w.tick,
      edgeId: null,
      fromNodeId: "external",
      fromPort: "ack",
      toNodeId: "rg",
      toPort: "ack",
      value: 1,
    });
    w = step(rgSpec, w);
    expect(w.nodeBufferedEdges.rg ?? []).toEqual([]);
    expect(w.queue.some((e) => e.value === 8 && e.edgeId === "inToRg")).toBe(true);
  });
});
