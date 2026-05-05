// Phase 8 Chunk 7 — InhibitRightGate parity. Asymmetric AND: emits
// 1 iff left=1 and right=0. left=1, right=0 → out=1.

import { describe, expect, it } from "vitest";
import { initWorld, runToQuiescent } from "../../src/sim/simulator";
import { historyToTrace, serializeTrace } from "../../src/sim/trace";
import type { Spec } from "../../src/schema";
import { edge, readFixture } from "./_helpers";

describe("trace: committed fixture pin", () => {
  it("simulator output matches test/fixtures/inhibit-right-gate.trace.jsonl", () => {
    const fixture: Spec = {
      nodes: [
        { id: "srcLeft", type: "Input", x: 0, y: 0 },
        { id: "srcRight", type: "Input", x: 0, y: 1 },
        { id: "irg", type: "InhibitRightGate", x: 1, y: 0 },
        { id: "sink", type: "Generic", x: 2, y: 0 },
      ],
      edges: [
        edge("srcLeftToIrg", "srcLeft", "out", "irg", "left"),
        edge("srcRightToIrg", "srcRight", "out", "irg", "right"),
        edge("irgOut", "irg", "out", "sink", "in"),
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
    expect(got).toBe(readFixture("inhibit-right-gate.trace.jsonl"));
  });
});
