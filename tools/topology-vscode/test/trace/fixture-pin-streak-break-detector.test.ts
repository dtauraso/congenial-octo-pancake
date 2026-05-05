// Phase 8 Chunk 3 — StreakBreakDetector parity. old=1, new=-1 (sign
// change) → done=1.

import { describe, expect, it } from "vitest";
import { initWorld, runToQuiescent } from "../../src/sim/simulator";
import { historyToTrace, serializeTrace } from "../../src/sim/trace";
import type { Spec } from "../../src/schema";
import { edge, readFixture } from "./_helpers";

describe("trace: committed fixture pin", () => {
  it("simulator output matches test/fixtures/streak-break-detector.trace.jsonl", () => {
    const fixture: Spec = {
      nodes: [
        { id: "srcOld", type: "Input", x: 0, y: 0 },
        { id: "srcNew", type: "Input", x: 0, y: 1 },
        { id: "sbd", type: "StreakBreakDetector", x: 1, y: 0 },
        { id: "sinkDone", type: "Generic", x: 2, y: 0 },
      ],
      edges: [
        edge("srcOldToSbd", "srcOld", "out", "sbd", "old"),
        edge("srcNewToSbd", "srcNew", "out", "sbd", "new"),
        edge("sbdDone", "sbd", "done", "sinkDone", "in"),
      ],
      timing: {
        steps: [],
        seed: [
          { nodeId: "srcOld", outPort: "out", value: 1, atTick: 0 },
          { nodeId: "srcNew", outPort: "out", value: -1, atTick: 1 },
        ],
      },
    };
    const w = runToQuiescent(fixture, initWorld(fixture));
    const got = serializeTrace(historyToTrace(w.history, fixture));
    expect(got).toBe(readFixture("streak-break-detector.trace.jsonl"));
  });
});
