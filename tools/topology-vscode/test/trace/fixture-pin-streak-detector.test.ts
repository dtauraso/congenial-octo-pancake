// Phase 8 Chunk 2 — StreakDetector parity. old=1, new=1 (matching
// signs) → done=1, streak=1. Two Generic sinks absorb the outputs
// so historyToTrace can emit both `send` events.

import { describe, expect, it } from "vitest";
import { initWorld, runToQuiescent } from "../../src/sim/simulator";
import { historyToTrace, serializeTrace } from "../../src/sim/trace";
import type { Spec } from "../../src/schema";
import { edge, readFixture } from "./_helpers";

describe("trace: committed fixture pin", () => {
  it("simulator output matches test/fixtures/streak-detector.trace.jsonl", () => {
    const fixture: Spec = {
      nodes: [
        { id: "srcOld", type: "Input", x: 0, y: 0 },
        { id: "srcNew", type: "Input", x: 0, y: 1 },
        { id: "sd", type: "StreakDetector", x: 1, y: 0 },
        { id: "sinkDone", type: "Generic", x: 2, y: 0 },
        { id: "sinkStreak", type: "Generic", x: 2, y: 1 },
      ],
      edges: [
        edge("srcOldToSd", "srcOld", "out", "sd", "old"),
        edge("srcNewToSd", "srcNew", "out", "sd", "new"),
        edge("sdDone", "sd", "done", "sinkDone", "in"),
        edge("sdStreak", "sd", "streak", "sinkStreak", "in"),
      ],
      timing: {
        steps: [],
        seed: [
          { nodeId: "srcOld", outPort: "out", value: 1, atTick: 0 },
          { nodeId: "srcNew", outPort: "out", value: 1, atTick: 1 },
        ],
      },
    };
    const w = runToQuiescent(fixture, initWorld(fixture));
    const got = serializeTrace(historyToTrace(w.history, fixture));
    expect(got).toBe(readFixture("streak-detector.trace.jsonl"));
  });
});
