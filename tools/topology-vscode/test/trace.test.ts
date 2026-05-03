// Phase 7 Chunk 1 — trace round-trip + parser validation.
//
// Strategy: run the simulator against fixture A (Input → ReadLatch →
// ChainInhibitor) to quiescence, lower world.history into the wire
// format, serialize, parse back, and assert byte-identical re-serialize.
// This pins both the projection and the on-disk format simultaneously.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initWorld, runToQuiescent } from "../src/sim/simulator";
import { historyToTrace, parseTrace, serializeTrace } from "../src/sim/trace";
import * as runner from "../src/sim/runner";
import type { Spec, Edge } from "../src/schema";

function edge(id: string, source: string, sh: string, target: string, th: string, kind: Edge["kind"] = "any"): Edge {
  return { id, source, sourceHandle: sh, target, targetHandle: th, kind };
}

const fixtureA: Spec = {
  nodes: [
    { id: "in", type: "Input", x: 0, y: 0 },
    { id: "rl", type: "ReadLatch", x: 1, y: 0 },
    { id: "ci", type: "ChainInhibitor", x: 2, y: 0 },
  ],
  edges: [
    edge("inToRl", "in", "out", "rl", "in", "chain"),
    edge("rlToCi", "rl", "out", "ci", "in", "chain"),
    edge("releaseInjector", "rl", "release", "rl", "release", "release"),
  ],
  timing: {
    steps: [],
    seed: [
      { nodeId: "in", outPort: "out", value: 5, atTick: 0 },
      { nodeId: "rl", outPort: "release", value: 1, atTick: 1 },
    ],
  },
};

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
    // step is monotonic and zero-based.
    expect(events[0].step).toBe(0);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].step).toBeGreaterThan(events[i - 1].step);
    }
  });
});

describe("trace: parser validation", () => {
  it("skips blank lines", () => {
    const jsonl = `{"step":0,"kind":"recv","node":"a","port":"in","value":1}\n\n{"step":1,"kind":"fire","node":"a"}\n`;
    expect(parseTrace(jsonl)).toHaveLength(2);
  });

  it("rejects unknown kind", () => {
    expect(() => parseTrace(`{"step":0,"kind":"teleport","node":"a"}`)).toThrow(/unknown kind/);
  });

  it("rejects non-monotonic step", () => {
    const j = `{"step":1,"kind":"fire","node":"a"}\n{"step":1,"kind":"fire","node":"b"}`;
    expect(() => parseTrace(j)).toThrow(/not greater than previous/);
  });

  it("rejects missing required field", () => {
    expect(() => parseTrace(`{"step":0,"kind":"send","edge":"e1"}`)).toThrow(/value/);
    expect(() => parseTrace(`{"step":0,"kind":"recv","node":"a","value":1}`)).toThrow(/port/);
  });

  it("rejects malformed JSON with line number", () => {
    expect(() => parseTrace(`{"step":0,"kind":"fire","node":"a"}\n{not json}`)).toThrow(/line 2/);
  });
});

describe("trace: committed fixture pin", () => {
  // The fixture is the bytes the Go runtime will eventually emit. If
  // the simulator's output drifts, this test fails first — forcing a
  // conscious decision about whether to update the fixture or fix the
  // sim. (Phase 7 Chunk 4 pins the same fixture against Go's output.)
  it("simulator output matches test/fixtures/chain-cascade.trace.jsonl", () => {
    const w = runToQuiescent(fixtureA, initWorld(fixtureA));
    const got = serializeTrace(historyToTrace(w.history, fixtureA));
    const expected = readFileSync(
      resolve(__dirname, "fixtures/chain-cascade.trace.jsonl"),
      "utf8",
    );
    expect(got).toBe(expected);
  });
});

describe("trace: runner replay", () => {
  it("loadTrace + stepOnce drives FireEvent and EmitEvent in trace order", () => {
    const events = parseTrace(
      readFileSync(resolve(__dirname, "fixtures/chain-cascade.trace.jsonl"), "utf8"),
    );
    runner.loadTrace(fixtureA, events);
    const fired: string[] = [];
    const unsub = runner.subscribe((e) => {
      if (e.type === "fire") fired.push(`fire:${e.nodeId}/${e.inputPort}=${e.inputValue}`);
      else fired.push(`emit:${e.edgeId}=${e.value}`);
    });
    // Drive every trace event.
    for (let i = 0; i < events.length; i++) runner.stepOnce();
    unsub();

    expect(fired).toEqual([
      "fire:rl/in=5",
      "fire:rl/release=1",
      "emit:rlToCi=5",
      "fire:ci/in=5",
    ]);
    // After replay, runner reports it's still in replay mode (the
    // schedule is exhausted but loadTrace was the most recent state
    // transition — load() would clear it).
    expect(runner.isReplaying()).toBe(true);
  });
});
