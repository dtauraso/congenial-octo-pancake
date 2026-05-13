// parseSpec cohort assignment: cohort N = max(predecessor cohorts) + 1
// where predecessors are wires terminating at the source node. Wires
// out of source nodes with no incoming wires are cohort 0.

import { describe, it, expect } from "vitest";
import { parseSpec, type RTopologySpec } from "../../src/webview/substrate-r/spec";

const wire = (id: string, src: string, dst: string, port = "in0") => ({
  id, source: { nodeId: src, port: "out" },
  target: { nodeId: dst, port }, pathD: "M0 0 L1 1", arcLength: 0,
});

describe("parseSpec cohort assignment", () => {
  it("single wire from a source-only node is cohort 0", () => {
    const spec: RTopologySpec = {
      nodes: [{ id: "a", kind: "input" }, { id: "b", kind: "readgate" }],
      wires: [wire("w0", "a", "b")],
    };
    parseSpec(spec);
    expect(spec.wires[0].cohort).toBe(0);
  });

  it("two independent wires from source-only nodes are both cohort 0", () => {
    const spec: RTopologySpec = {
      nodes: [
        { id: "a", kind: "input" }, { id: "b", kind: "readgate" },
        { id: "c", kind: "input" }, { id: "d", kind: "readgate" },
      ],
      wires: [wire("w0", "a", "b"), wire("w1", "c", "d")],
    };
    parseSpec(spec);
    expect(spec.wires.map((w) => w.cohort)).toEqual([0, 0]);
  });

  it("cycle: back-edge gets highest cohort, no throw", () => {
    // readgate1 → i0 → i1 → readgate1 (closes the cycle), plus an
    // independent input → readgate1 feeding the AND's other slot.
    const spec: RTopologySpec = {
      nodes: [
        { id: "in", kind: "input" },
        { id: "rg", kind: "readgate", ports: { inputs: ["chainIn", "chainIn2"], outputs: ["out"] } },
        { id: "i0", kind: "chaininhibitor" },
        { id: "i1", kind: "chaininhibitor" },
      ],
      wires: [
        wire("w0", "in", "rg", "chainIn"),
        { id: "w1", source: { nodeId: "rg", port: "out" }, target: { nodeId: "i0", port: "in" }, pathD: "M0 0 L1 1", arcLength: 0 },
        { id: "w2", source: { nodeId: "i0", port: "out" }, target: { nodeId: "i1", port: "in" }, pathD: "M0 0 L1 1", arcLength: 0 },
        { id: "w3", source: { nodeId: "i1", port: "out" }, target: { nodeId: "rg", port: "chainIn2" }, pathD: "M0 0 L1 1", arcLength: 0 },
      ],
    };
    expect(() => parseSpec(spec)).not.toThrow();
    const byId = Object.fromEntries(spec.wires.map((w) => [w.id, w.cohort]));
    expect(byId.w0).toBe(0);
    expect(byId.w1).toBe(1);
    expect(byId.w2).toBe(2);
    expect(byId.w3).toBe(3);
  });
});
