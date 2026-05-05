// Shared helpers for trace/* test files.

import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import type { Edge, Spec } from "../../src/schema";

export function edge(
  id: string,
  source: string,
  sh: string,
  target: string,
  th: string,
  kind: Edge["kind"] = "any",
): Edge {
  return { id, source, sourceHandle: sh, target, targetHandle: th, kind };
}

export function readFixture(name: string): string {
  return readFileSync(resolve(__dirname, "../fixtures", name), "utf8");
}

// Fixture A: Input → ReadLatch → ChainInhibitor with self-edge release
// injector. Used by round-trip, fixture pin, and runner replay tests.
export const fixtureA: Spec = {
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
