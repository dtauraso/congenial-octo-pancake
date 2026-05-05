// Phase 8 Chunk 1 — AndGate parity. Two seeds (a=1, b=1) drive a
// single AndGate join; the output edge to a Generic sink lets
// historyToTrace emit the `send` event. Sink has no input handler,
// so the simulator silently absorbs the delivered value.

import { describe, expect, it } from "vitest";
import { initWorld, runToQuiescent } from "../../src/sim/simulator";
import { historyToTrace, serializeTrace } from "../../src/sim/trace";
import type { Spec } from "../../src/schema";
import { edge, readFixture } from "./_helpers";

describe("trace: committed fixture pin", () => {
  it("simulator output matches test/fixtures/and-gate.trace.jsonl", () => {
    const fixture: Spec = {
      nodes: [
        { id: "srcA", type: "Input", x: 0, y: 0 },
        { id: "srcB", type: "Input", x: 0, y: 1 },
        { id: "ag", type: "AndGate", x: 1, y: 0 },
        { id: "sink", type: "Generic", x: 2, y: 0 },
      ],
      edges: [
        edge("srcAToAg", "srcA", "out", "ag", "a"),
        edge("srcBToAg", "srcB", "out", "ag", "b"),
        edge("agOut", "ag", "out", "sink", "in"),
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
    expect(got).toBe(readFixture("and-gate.trace.jsonl"));
  });
});
