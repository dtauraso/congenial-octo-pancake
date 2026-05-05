// Mirrors topology.json: in0 → readGate.chainIn (slots:1), readGate
// → i0 → i1 → readGate.ack (init: [1] to seed the cycle). Three input
// values [0,1,0] one tick apart. Without slot capacity all three race
// into the readGate buffer and overwrite. With slots:1 on
// inputToReadGate, value N+1 is held at the source until readGate
// fires on value N, mirroring the Go ack handshake.

import { describe, expect, it } from "vitest";
import { initWorld, step } from "../../src/sim/simulator";
import type { Spec, StateValue } from "../../src/schema";
import { edge } from "./_helpers";

const cycleSpec: Spec = {
  nodes: [
    { id: "in0", type: "Input", x: 0, y: 0, data: { init: [0, 1, 0] } },
    { id: "readGate", type: "ReadGate", x: 1, y: 0 },
    { id: "i0", type: "ChainInhibitor", x: 2, y: 0 },
    { id: "i1", type: "ChainInhibitor", x: 3, y: 0 },
  ],
  edges: [
    {
      id: "inputToReadGate",
      source: "in0",
      sourceHandle: "out",
      target: "readGate",
      targetHandle: "chainIn",
      kind: "chain",
      data: { slots: 1 },
    },
    edge("readGateToI0", "readGate", "out", "i0", "in", "chain"),
    edge("i0ToI1", "i0", "out", "i1", "in", "chain"),
    {
      id: "i1AckToReadGate",
      source: "i1",
      sourceHandle: "ack",
      target: "readGate",
      targetHandle: "ack",
      kind: "feedback-ack",
      data: { init: [1] },
    },
  ],
};

describe("simulator: readGate cycle backpressure (audit row #1)", () => {
  it("holds inputs 2 and 3 at the source until ack handshakes free the slot", () => {
    const w0 = initWorld(cycleSpec);
    // Default Input seeding fans the [0,1,0] init across atTick=0,1,2.
    // Only the atTick=0 seed enters the queue; atTick=1 and atTick=2
    // sit in pendingSeeds (deferred so they don't grab the slot before
    // their emission is due — see initWorld for the rationale).
    const inFlight = w0.queue.filter(
      (e) => e.edgeId === "inputToReadGate",
    ).length;
    expect(inFlight).toBe(1);
    expect(w0.pendingSeeds.length).toBe(2);
    expect(w0.edgeOccupancy.inputToReadGate).toBe(1);
  });

  it("delivers all three values to i0 in order across the running cycle", () => {
    let w = initWorld(cycleSpec);
    const i0Arrivals: StateValue[] = [];
    for (let i = 0; i < 200; i++) {
      if (w.queue.length === 0) break;
      const before = w.history.length;
      w = step(cycleSpec, w);
      for (const rec of w.history.slice(before)) {
        if (rec.nodeId === "i0" && rec.inputPort === "in") {
          i0Arrivals.push(rec.inputValue);
        }
      }
    }
    expect(i0Arrivals).toEqual([0, 1, 0]);
    expect(w.edgePending.inputToReadGate ?? []).toEqual([]);
  });
});
