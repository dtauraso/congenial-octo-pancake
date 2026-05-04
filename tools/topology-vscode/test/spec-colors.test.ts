import { describe, expect, it } from "vitest";
import { KIND_COLORS, parseSpec, type Spec } from "../src/schema";
import { outgoingEdgeColors } from "../src/webview/rf/spec-colors";

const baseSpec: Spec = parseSpec({
  nodes: [
    { id: "in0", type: "Input", x: 0, y: 0 },
    { id: "i0", type: "ChainInhibitor", x: 100, y: 0 },
    { id: "i1", type: "ChainInhibitor", x: 200, y: 0 },
  ],
  edges: [
    { id: "in0_to_i0", source: "in0", sourceHandle: "out", target: "i0", targetHandle: "in", kind: "chain" },
    { id: "i0_to_i1", source: "i0", sourceHandle: "out", target: "i1", targetHandle: "in", kind: "chain" },
    { id: "i0_inhibit_i1", source: "i0", sourceHandle: "inhibitOut", target: "i1", targetHandle: "in", kind: "inhibit-in" },
  ],
});

describe("outgoingEdgeColors", () => {
  it("maps each outgoing edge to its kind color", () => {
    const m = outgoingEdgeColors(baseSpec, "i0");
    expect(m.get("i0_to_i1")).toBe(KIND_COLORS["chain"]);
    expect(m.get("i0_inhibit_i1")).toBe(KIND_COLORS["inhibit-in"]);
    expect(m.size).toBe(2);
  });

  it("excludes edges where the node is only the target", () => {
    const m = outgoingEdgeColors(baseSpec, "i0");
    expect(m.has("in0_to_i0")).toBe(false);
  });

  it("returns an empty map for a node with no outgoing edges", () => {
    expect(outgoingEdgeColors(baseSpec, "i1").size).toBe(0);
  });

  it("returns an empty map for an unknown node id (control-flow atoms with no output have no colors to resolve)", () => {
    expect(outgoingEdgeColors(baseSpec, "does-not-exist").size).toBe(0);
  });

  it("recolors automatically when an edge changes kind (resolution is against live spec)", () => {
    const recolored = parseSpec({
      ...baseSpec,
      edges: baseSpec.edges.map((e) => (e.id === "i0_to_i1" ? { ...e, kind: "signal" } : e)),
    });
    expect(outgoingEdgeColors(recolored, "i0").get("i0_to_i1")).toBe(KIND_COLORS["signal"]);
  });
});

describe("spec/notes round-trip via parseSpec", () => {
  it("preserves spec.segments (text + outputRef) and notes through JSON round-trip", () => {
    const src = {
      nodes: [
        {
          id: "i0",
          type: "ChainInhibitor",
          x: 0,
          y: 0,
          spec: {
            lang: "en",
            segments: [
              { text: "emit on " },
              { outputRef: "i0_to_i1" },
              { text: " when input ≠ 0" },
            ],
          },
          notes: "human-authored",
        },
        { id: "i1", type: "ChainInhibitor", x: 100, y: 0 },
      ],
      edges: [
        { id: "i0_to_i1", source: "i0", sourceHandle: "out", target: "i1", targetHandle: "in", kind: "chain" },
      ],
    };
    const round = parseSpec(JSON.parse(JSON.stringify(src)));
    expect(round.nodes[0].spec).toEqual(src.nodes[0].spec);
    expect(round.nodes[0].notes).toBe("human-authored");
  });

  it("treats a node with no outputRef segments (control-flow atom) as having no colored spans", () => {
    const src = parseSpec({
      nodes: [
        {
          id: "branch",
          type: "Generic",
          x: 0,
          y: 0,
          spec: {
            lang: "en",
            segments: [{ text: "advance program counter" }],
          },
        },
      ],
      edges: [],
    });
    const segs = src.nodes[0].spec!.segments;
    const refs = segs.filter((s) => "outputRef" in s);
    expect(refs.length).toBe(0);
  });
});
