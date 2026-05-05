// Phase 8 Chunk 4 — ReadGate parity. AndGate variant: emits the
// chainIn value verbatim once both chainIn and ack have arrived.
// chainIn=7, ack=1 → out=7.

import { describe, expect, it } from "vitest";
import { initWorld, runToQuiescent } from "../../src/sim/simulator";
import { historyToTrace, serializeTrace } from "../../src/sim/trace";
import type { Spec } from "../../src/schema";
import { edge, readFixture } from "./_helpers";

describe("trace: committed fixture pin", () => {
  it("simulator output matches test/fixtures/read-gate.trace.jsonl", () => {
    const fixture: Spec = {
      nodes: [
        { id: "srcChain", type: "Input", x: 0, y: 0 },
        { id: "srcAck", type: "Input", x: 0, y: 1 },
        { id: "rg", type: "ReadGate", x: 1, y: 0 },
        { id: "sink", type: "Generic", x: 2, y: 0 },
      ],
      edges: [
        edge("srcChainToRg", "srcChain", "out", "rg", "chainIn"),
        edge("srcAckToRg", "srcAck", "out", "rg", "ack"),
        edge("rgOut", "rg", "out", "sink", "in"),
      ],
      timing: {
        steps: [],
        seed: [
          { nodeId: "srcChain", outPort: "out", value: 7, atTick: 0 },
          { nodeId: "srcAck", outPort: "out", value: 1, atTick: 1 },
        ],
      },
    };
    const w = runToQuiescent(fixture, initWorld(fixture));
    const got = serializeTrace(historyToTrace(w.history, fixture));
    expect(got).toBe(readFixture("read-gate.trace.jsonl"));
  });
});
