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
});
