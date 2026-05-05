// Phase 8 Chunk 8 — EdgeNode parity. Buffers left/right values and
// emits XOR identically on three outputs (current inhibitor,
// partition, next edge), mirroring the three S.Send calls in
// EdgeNode/EdgeNode.go. left=1, right=0 → outInhibitor /
// outPartition / outNextEdge all = 1.

import { describe, expect, it } from "vitest";
import { initWorld, runToQuiescent } from "../../src/sim/simulator";
import { historyToTrace, serializeTrace } from "../../src/sim/trace";
import type { Spec } from "../../src/schema";
import { edge, readFixture } from "./_helpers";

describe("trace: committed fixture pin", () => {
  it("simulator output matches test/fixtures/edge-node.trace.jsonl", () => {
    const fixture: Spec = {
      nodes: [
        { id: "srcLeft", type: "Input", x: 0, y: 0 },
        { id: "srcRight", type: "Input", x: 0, y: 1 },
        { id: "edn", type: "EdgeNode", x: 1, y: 0 },
        { id: "sinkInhibitor", type: "Generic", x: 2, y: 0 },
        { id: "sinkPartition", type: "Generic", x: 2, y: 1 },
        { id: "sinkNextEdge", type: "Generic", x: 2, y: 2 },
      ],
      edges: [
        edge("srcLeftToEdn", "srcLeft", "out", "edn", "left"),
        edge("srcRightToEdn", "srcRight", "out", "edn", "right"),
        edge("ednInhibitor", "edn", "outInhibitor", "sinkInhibitor", "in"),
        edge("ednPartition", "edn", "outPartition", "sinkPartition", "in"),
        edge("ednNextEdge", "edn", "outNextEdge", "sinkNextEdge", "in"),
      ],
      timing: {
        steps: [],
        seed: [
          { nodeId: "srcLeft", outPort: "out", value: 1, atTick: 0 },
          { nodeId: "srcRight", outPort: "out", value: 0, atTick: 1 },
        ],
      },
    };
    const w = runToQuiescent(fixture, initWorld(fixture));
    const got = serializeTrace(historyToTrace(w.history, fixture));
    expect(got).toBe(readFixture("edge-node.trace.jsonl"));
  });
});
