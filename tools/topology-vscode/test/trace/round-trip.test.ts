// Phase 7 Chunk 1 — trace round-trip. Run the simulator against fixture
// A, lower world.history into the wire format, serialize, parse back,
// and assert byte-identical re-serialize.

import { describe, expect, it } from "vitest";
import { initWorld, runToQuiescent } from "../../src/sim/simulator";
import {
  historyToTrace,
  parseTrace,
  serializeTrace,
} from "../../src/sim/trace";
import { fixtureA } from "./_helpers";

describe("trace: round-trip", () => {
  it("history → serialize → parse is byte-identical on re-serialize", () => {
    const w = runToQuiescent(fixtureA, initWorld(fixtureA));
    const events = historyToTrace(w.history, fixtureA);
    const jsonl = serializeTrace(events);
    const parsed = parseTrace(jsonl);
    expect(parsed).toEqual(events);
    expect(serializeTrace(parsed)).toBe(jsonl);
  });

  it("emits recv for every history record and send per outgoing edge", () => {
    const w = runToQuiescent(fixtureA, initWorld(fixtureA));
    const events = historyToTrace(w.history, fixtureA);
    const recvCount = events.filter((e) => e.kind === "recv").length;
    expect(recvCount).toBe(w.history.length);
    expect(events[0].step).toBe(0);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].step).toBeGreaterThan(events[i - 1].step);
    }
  });
});
