// The fixture is the bytes the Go runtime will eventually emit. If
// the simulator's output drifts, this test fails first — forcing a
// conscious decision about whether to update the fixture or fix the
// sim. (Phase 7 Chunk 4 pins the same fixture against Go's output.)

import { describe, expect, it } from "vitest";
import { initWorld, runToQuiescent } from "../../src/sim/simulator";
import { historyToTrace, serializeTrace } from "../../src/sim/trace";
import { fixtureA, readFixture } from "./_helpers";

describe("trace: committed fixture pin", () => {
  it("simulator output matches test/fixtures/chain-cascade.trace.jsonl", () => {
    const w = runToQuiescent(fixtureA, initWorld(fixtureA));
    const got = serializeTrace(historyToTrace(w.history, fixtureA));
    expect(got).toBe(readFixture("chain-cascade.trace.jsonl"));
  });
});
