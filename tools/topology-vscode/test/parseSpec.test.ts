// Cover the reject paths in parseSpec / validatePorts. The accept path is
// already exercised by round-trip.test.ts; here we only assert that
// malformed input throws so a corrupt topology.json can't slip through to
// codegen.

import { describe, it, expect } from "vitest";
import { parseSpec } from "../src/schema";

const okNode = { id: "n", type: "ChainInhibitor", x: 0, y: 0 };
const okEdge = {
  id: "e", source: "n", sourceHandle: "out",
  target: "n", targetHandle: "chainIn", kind: "chain",
};

describe("parseSpec rejects", () => {
  it("non-object input", () => {
    expect(() => parseSpec(null)).toThrow();
    expect(() => parseSpec(42)).toThrow();
    expect(() => parseSpec([])).toThrow();
  });

  it("missing or non-array nodes / edges", () => {
    expect(() => parseSpec({ edges: [] })).toThrow();
    expect(() => parseSpec({ nodes: [], edges: "no" })).toThrow();
    expect(() => parseSpec({ nodes: {}, edges: [] })).toThrow();
  });

  it("node with non-string id", () => {
    expect(() =>
      parseSpec({ nodes: [{ ...okNode, id: 1 }], edges: [] }),
    ).toThrow(/spec\.nodes\[0\]\.id/);
  });

  it("node missing x or y", () => {
    expect(() =>
      parseSpec({ nodes: [{ id: "a", type: "Input" }], edges: [] }),
    ).toThrow(/spec\.nodes\[0\]\.x/);
  });

  it("edge with kind outside EDGE_KINDS", () => {
    expect(() =>
      parseSpec({
        nodes: [okNode],
        edges: [{ ...okEdge, kind: "weird" }],
      }),
    ).toThrow(/spec\.edges\[0\]\.kind/);
  });

  it("edge with non-string source/target", () => {
    expect(() =>
      parseSpec({
        nodes: [okNode],
        edges: [{ ...okEdge, source: 1 }],
      }),
    ).toThrow(/spec\.edges\[0\]\.source/);
  });

  it("validatePorts: edge points at unknown node", () => {
    expect(() =>
      parseSpec({
        nodes: [okNode],
        edges: [{ ...okEdge, source: "ghost" }],
      }),
    ).toThrow(/unknown source ghost/);
  });

  it("validatePorts: edge handle that does not exist on the node type", () => {
    expect(() =>
      parseSpec({
        nodes: [okNode],
        edges: [{ ...okEdge, sourceHandle: "nope" }],
      }),
    ).toThrow(/has no output port "nope"/);
  });

  it("timing.steps with non-string fires entry", () => {
    expect(() =>
      parseSpec({
        nodes: [okNode], edges: [],
        timing: { steps: [{ t: 0, event: "x", fires: [1] }] },
      }),
    ).toThrow(/spec\.timing\.steps\[0\]\.fires\[0\]/);
  });

  it("legend row with bad kind", () => {
    expect(() =>
      parseSpec({
        nodes: [okNode], edges: [],
        legend: [{ kind: "weird", name: "n", desc: "d" }],
      }),
    ).toThrow(/spec\.legend\[0\]\.kind/);
  });

  it("notes entry without text", () => {
    expect(() =>
      parseSpec({
        nodes: [okNode], edges: [],
        notes: [{ x: 0, y: 0 }],
      }),
    ).toThrow(/spec\.notes\[0\]\.text/);
  });
});

describe("parseSpec accepts", () => {
  it("a minimal valid spec", () => {
    const s = parseSpec({ nodes: [okNode], edges: [] });
    expect(s.nodes).toHaveLength(1);
    expect(s.edges).toHaveLength(0);
  });

  it("preserves node.props when present", () => {
    const s = parseSpec({
      nodes: [{ ...okNode, props: { delay: 2, label: "x" } }],
      edges: [],
    });
    expect(s.nodes[0].props).toEqual({ delay: 2, label: "x" });
  });

  it("rejects non-scalar values inside node.props", () => {
    expect(() =>
      parseSpec({
        nodes: [{ ...okNode, props: { delay: { nested: 1 } } }],
        edges: [],
      }),
    ).toThrow(/spec\.nodes\[0\]\.props\.delay/);
  });
});
