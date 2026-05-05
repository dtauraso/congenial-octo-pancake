// Phase 8 Chunk 5 — SyncGate parity. AndGate variant whose output is
// always release=1 once both inputs arrive (input values are ignored
// — sync gates only signal "both detectors finished").

import { describe, expect, it } from "vitest";
import { initWorld, runToQuiescent } from "../../src/sim/simulator";
import { historyToTrace, serializeTrace } from "../../src/sim/trace";
import type { Spec } from "../../src/schema";
import { edge, readFixture } from "./_helpers";

describe("trace: committed fixture pin", () => {
  it("simulator output matches test/fixtures/sync-gate.trace.jsonl", () => {
    const fixture: Spec = {
      nodes: [
        { id: "srcA", type: "Input", x: 0, y: 0 },
        { id: "srcB", type: "Input", x: 0, y: 1 },
        { id: "sg", type: "SyncGate", x: 1, y: 0 },
        { id: "sink", type: "Generic", x: 2, y: 0 },
      ],
      edges: [
        edge("srcAToSg", "srcA", "out", "sg", "a"),
        edge("srcBToSg", "srcB", "out", "sg", "b"),
        edge("sgRelease", "sg", "release", "sink", "in"),
      ],
      timing: {
        steps: [],
        seed: [
          { nodeId: "srcA", outPort: "out", value: 1, atTick: 0 },
          { nodeId: "srcB", outPort: "out", value: 1, atTick: 1 },
        ],
      },
    };
    const w = runToQuiescent(fixture, initWorld(fixture));
    const got = serializeTrace(historyToTrace(w.history, fixture));
    expect(got).toBe(readFixture("sync-gate.trace.jsonl"));
  });
});
