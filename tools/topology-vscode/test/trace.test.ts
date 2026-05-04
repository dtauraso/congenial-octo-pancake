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

  // Phase 8 Chunk 1 — AndGate parity. Two seeds (a=1, b=1) drive a
  // single AndGate join; the output edge to a Generic sink lets
  // historyToTrace emit the `send` event. Sink has no input handler,
  // so the simulator silently absorbs the delivered value (no recv on
  // sink, matching the chain-cascade convention where ci's outgoing
  // sends drop into nothing).
  it("simulator output matches test/fixtures/and-gate.trace.jsonl", () => {
    const fixtureAndGate: Spec = {
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
    const w = runToQuiescent(fixtureAndGate, initWorld(fixtureAndGate));
    const got = serializeTrace(historyToTrace(w.history, fixtureAndGate));
    const expected = readFileSync(
      resolve(__dirname, "fixtures/and-gate.trace.jsonl"),
      "utf8",
    );
    expect(got).toBe(expected);
  });

  // Phase 8 Chunk 2 — StreakDetector parity. old=1, new=1 (matching
  // signs) → done=1, streak=1. Two Generic sinks absorb the outputs
  // so historyToTrace can emit both `send` events.
  it("simulator output matches test/fixtures/streak-detector.trace.jsonl", () => {
    const fixtureSD: Spec = {
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
    const w = runToQuiescent(fixtureSD, initWorld(fixtureSD));
    const got = serializeTrace(historyToTrace(w.history, fixtureSD));
    const expected = readFileSync(
      resolve(__dirname, "fixtures/streak-detector.trace.jsonl"),
      "utf8",
    );
    expect(got).toBe(expected);
  });

  // Phase 8 Chunk 3 — StreakBreakDetector parity. old=1, new=-1 (sign
  // change) → done=1.
  it("simulator output matches test/fixtures/streak-break-detector.trace.jsonl", () => {
    const fixtureSBD: Spec = {
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
    const w = runToQuiescent(fixtureSBD, initWorld(fixtureSBD));
    const got = serializeTrace(historyToTrace(w.history, fixtureSBD));
    const expected = readFileSync(
      resolve(__dirname, "fixtures/streak-break-detector.trace.jsonl"),
      "utf8",
    );
    expect(got).toBe(expected);
  });

  // Phase 8 Chunk 4 — ReadGate parity. AndGate variant: emits the
  // chainIn value verbatim once both chainIn and ack have arrived.
  // chainIn=7, ack=1 → out=7.
  it("simulator output matches test/fixtures/read-gate.trace.jsonl", () => {
    const fixtureRG: Spec = {
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
    const w = runToQuiescent(fixtureRG, initWorld(fixtureRG));
    const got = serializeTrace(historyToTrace(w.history, fixtureRG));
    const expected = readFileSync(
      resolve(__dirname, "fixtures/read-gate.trace.jsonl"),
      "utf8",
    );
    expect(got).toBe(expected);
  });

  // Phase 8 Chunk 5 — SyncGate parity. AndGate variant whose output
  // is always release=1 once both inputs arrive (input values are
  // ignored — sync gates only signal "both detectors finished").
  it("simulator output matches test/fixtures/sync-gate.trace.jsonl", () => {
    const fixtureSG: Spec = {
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
    const w = runToQuiescent(fixtureSG, initWorld(fixtureSG));
    const got = serializeTrace(historyToTrace(w.history, fixtureSG));
    const expected = readFileSync(
      resolve(__dirname, "fixtures/sync-gate.trace.jsonl"),
      "utf8",
    );
    expect(got).toBe(expected);
  });

  // Phase 8 Chunk 6 — Partition parity. State machine NotInit →
  // Growing (emit 1) → Stopped (emit 0), advanced by value=1 on
  // `in`. Two seeds drive the two transitions.
  it("simulator output matches test/fixtures/partition.trace.jsonl", () => {
    const fixtureP: Spec = {
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
    const w = runToQuiescent(fixtureP, initWorld(fixtureP));
    const got = serializeTrace(historyToTrace(w.history, fixtureP));
    const expected = readFileSync(
      resolve(__dirname, "fixtures/partition.trace.jsonl"),
      "utf8",
    );
    expect(got).toBe(expected);
  });

  // Phase 8 Chunk 7 — InhibitRightGate parity. Asymmetric AND: emits
  // 1 iff left=1 and right=0. left=1, right=0 → out=1.
  it("simulator output matches test/fixtures/inhibit-right-gate.trace.jsonl", () => {
    const fixtureIRG: Spec = {
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
    const w = runToQuiescent(fixtureIRG, initWorld(fixtureIRG));
    const got = serializeTrace(historyToTrace(w.history, fixtureIRG));
    const expected = readFileSync(
      resolve(__dirname, "fixtures/inhibit-right-gate.trace.jsonl"),
      "utf8",
    );
    expect(got).toBe(expected);
  });
  // Phase 8 Chunk 8 — EdgeNode parity. Buffers left/right values and
  // emits XOR identically on three outputs (current inhibitor,
  // partition, next edge), mirroring the three S.Send calls in
  // EdgeNode/EdgeNode.go. left=1, right=0 → outInhibitor/outPartition/
  // outNextEdge all = 1.
  it("simulator output matches test/fixtures/edge-node.trace.jsonl", () => {
    const fixtureEdge: Spec = {
      nodes: [
        { id: "srcLeft", type: "Input", x: 0, y: 0 },
        { id: "srcRight", type: "Input", x: 0, y: 1 },
        { id: "edn", type: "EdgeNode", x: 1, y: 0 },
        { id: "sinkInhibitor", type: "Generic", x: 2, y: 0 },
        { id: "sinkPartition", type: "Generic", x: 2, y: 1 },
        { id: "sinkNextEdge", type: "Generic", x: 2, y: 2 },
      ],
      edges: [
        edge("srcLeftToEdn", "srcLeft", "out", "edn", "left"),
        edge("srcRightToEdn", "srcRight", "out", "edn", "right"),
        edge("ednInhibitor", "edn", "outInhibitor", "sinkInhibitor", "in"),
        edge("ednPartition", "edn", "outPartition", "sinkPartition", "in"),
        edge("ednNextEdge", "edn", "outNextEdge", "sinkNextEdge", "in"),
      ],
      timing: {
        steps: [],
        seed: [
          { nodeId: "srcLeft", outPort: "out", value: 1, atTick: 0 },
          { nodeId: "srcRight", outPort: "out", value: 0, atTick: 1 },
        ],
      },
    };
    const w = runToQuiescent(fixtureEdge, initWorld(fixtureEdge));
    const got = serializeTrace(historyToTrace(w.history, fixtureEdge));
    const expected = readFileSync(
      resolve(__dirname, "fixtures/edge-node.trace.jsonl"),
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
