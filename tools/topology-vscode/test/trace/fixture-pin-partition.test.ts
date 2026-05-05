// Phase 8 Chunk 6 — Partition parity. State machine NotInit →
// Growing (emit 1) → Stopped (emit 0), advanced by value=1 on `in`.
// Two seeds drive the two transitions.

import { describe, expect, it } from "vitest";
import { initWorld, runToQuiescent } from "../../src/sim/simulator";
import { historyToTrace, serializeTrace } from "../../src/sim/trace";
import type { Spec } from "../../src/schema";
import { edge, readFixture } from "./_helpers";

describe("trace: committed fixture pin", () => {
  it("simulator output matches test/fixtures/partition.trace.jsonl", () => {
    const fixture: Spec = {
      nodes: [
        { id: "src", type: "Input", x: 0, y: 0 },
        { id: "p", type: "Partition", x: 1, y: 0 },
        { id: "sink", type: "Generic", x: 2, y: 0 },
      ],
      edges: [
        edge("srcToP", "src", "out", "p", "in"),
        edge("pOut", "p", "out", "sink", "in"),
      ],
      timing: {
        steps: [],
        seed: [
          { nodeId: "src", outPort: "out", value: 1, atTick: 0 },
          { nodeId: "src", outPort: "out", value: 1, atTick: 1 },
        ],
      },
    };
    const w = runToQuiescent(fixture, initWorld(fixture));
    const got = serializeTrace(historyToTrace(w.history, fixture));
    expect(got).toBe(readFixture("partition.trace.jsonl"));
  });
});
