// Phase 7 Chunk 5 — Tier 2 invariant: replay never mutates the spec.
//
// "Trace is observation, spec is design." This test promotes that rule
// from doc to mechanical check: load a spec, drive a full trace replay
// to exhaustion, and assert JSON.stringify(spec) is byte-identical
// before and after. Any code path that accidentally edits spec.nodes
// or spec.edges during replay (e.g. a handler that mutates props in
// place, a runner that stamps state onto the spec) trips this test.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseTrace } from "../src/sim/trace";
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

describe("trace replay: spec immutability (Tier 2)", () => {
  it("loadTrace + step-to-end leaves spec byte-identical", () => {
    const events = parseTrace(
      readFileSync(resolve(__dirname, "fixtures/chain-cascade.trace.jsonl"), "utf8"),
    );
    const before = JSON.stringify(fixtureA);

    runner.loadTrace(fixtureA, events);
    // +5 cushion exercises the post-exhaustion no-op path; replayStepOnce
    // is synchronous so events.length calls drain the schedule exactly.
    for (let i = 0; i < events.length + 5; i++) runner.stepOnce();

    expect(JSON.stringify(fixtureA)).toBe(before);
    expect(runner.isReplaying()).toBe(true);
  });
});
