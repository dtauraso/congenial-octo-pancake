// Phase 5.5 N1' classifier tests. Pins:
//   - non-gated chains classify as concurrent
//   - gate node types and everything downstream classify as gated
//   - per-edge `concurrent: true | false` overrides override auto

import { describe, expect, it } from "vitest";
import { classifyConcurrentEdges } from "../src/sim/concurrency";
import type { Spec, Edge } from "../src/schema";

function edge(
  id: string,
  source: string,
  target: string,
  opts: Partial<Edge> = {},
): Edge {
  return {
    id,
    source,
    sourceHandle: "out",
    target,
    targetHandle: "in",
    kind: "any",
    ...opts,
  };
}

describe("classifyConcurrentEdges", () => {
  it("marks edges in a non-gated chain as concurrent", () => {
    const spec: Spec = {
      nodes: [
        { id: "in", type: "Input", x: 0, y: 0 },
        { id: "p", type: "Partition", x: 1, y: 0 },
        { id: "ci", type: "ChainInhibitor", x: 2, y: 0 },
      ],
      edges: [edge("e1", "in", "p"), edge("e2", "p", "ci")],
    };
    const c = classifyConcurrentEdges(spec);
    expect(c.has("e1")).toBe(true);
    expect(c.has("e2")).toBe(true);
  });

  it("treats gate-type sources and downstream nodes as gated", () => {
    const spec: Spec = {
      nodes: [
        { id: "in", type: "Input", x: 0, y: 0 },
        { id: "ag", type: "AndGate", x: 1, y: 0 },
        { id: "ci", type: "ChainInhibitor", x: 2, y: 0 },
      ],
      edges: [
        edge("e1", "in", "ag"),
        edge("e2", "ag", "ci"),
      ],
    };
    const c = classifyConcurrentEdges(spec);
    // in→ag: source `in` is not a gate and not downstream of one →
    // concurrent. ag→ci: source `ag` IS a gate → gated.
    expect(c.has("e1")).toBe(true);
    expect(c.has("e2")).toBe(false);
  });

  it("propagates gating downstream through chains", () => {
    const spec: Spec = {
      nodes: [
        { id: "in", type: "Input", x: 0, y: 0 },
        { id: "ag", type: "AndGate", x: 1, y: 0 },
        { id: "ci1", type: "ChainInhibitor", x: 2, y: 0 },
        { id: "ci2", type: "ChainInhibitor", x: 3, y: 0 },
      ],
      edges: [
        edge("e1", "in", "ag"),
        edge("e2", "ag", "ci1"),
        edge("e3", "ci1", "ci2"),
      ],
    };
    const c = classifyConcurrentEdges(spec);
    expect(c.has("e1")).toBe(true);
    expect(c.has("e2")).toBe(false);
    // ci1 is downstream of a gate → its outgoing edges stay gated.
    expect(c.has("e3")).toBe(false);
  });

  it("respects manual concurrent: true override", () => {
    const spec: Spec = {
      nodes: [
        { id: "ag", type: "AndGate", x: 0, y: 0 },
        { id: "ci", type: "ChainInhibitor", x: 1, y: 0 },
      ],
      edges: [edge("e", "ag", "ci", { concurrent: true })],
    };
    expect(classifyConcurrentEdges(spec).has("e")).toBe(true);
  });

  it("respects manual concurrent: false override", () => {
    const spec: Spec = {
      nodes: [
        { id: "in", type: "Input", x: 0, y: 0 },
        { id: "ci", type: "ChainInhibitor", x: 1, y: 0 },
      ],
      edges: [edge("e", "in", "ci", { concurrent: false })],
    };
    expect(classifyConcurrentEdges(spec).has("e")).toBe(false);
  });
});
