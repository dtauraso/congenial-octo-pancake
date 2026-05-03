// Tier 2 retro: delete atomicity. Mirrors rename.test.ts — every spot that
// holds a node or edge id must be scrubbed in lockstep when the user
// deletes a selection. Cascade rule: deleting a node implicitly deletes
// every edge incident to it.

import { describe, expect, it } from "vitest";
import { type Spec } from "../src/schema";
import { applyDelete } from "../src/webview/delete-core";
import { type ViewerState } from "../src/webview/viewerState";

function fixture(): { spec: Spec; vs: ViewerState } {
  const spec: Spec = {
    nodes: [
      { id: "a", type: "Generic", x: 0, y: 0 },
      { id: "b", type: "Generic", x: 50, y: 0 },
      { id: "c", type: "Generic", x: 100, y: 0 },
    ],
    edges: [
      { id: "ab", source: "a", sourceHandle: "out", target: "b", targetHandle: "in", kind: "chain" },
      { id: "bc", source: "b", sourceHandle: "out", target: "c", targetHandle: "in", kind: "chain" },
      { id: "ac", source: "a", sourceHandle: "out", target: "c", targetHandle: "in", kind: "chain" },
    ],
    timing: {
      steps: [
        {
          t: 0,
          event: "fire",
          fires: ["a", "b", "c"],
          departs: ["ab", "bc", "ac"],
          arrives: ["ab", "bc", "ac"],
          state: { a: { v: 1 }, b: { v: 2 }, c: { v: 3 } },
        },
      ],
    },
  };
  const vs: ViewerState = {
    views: [{ name: "v", viewport: { x: 0, y: 0, w: 100, h: 100 }, nodeIds: ["a", "b", "c"] }],
    folds: [{ id: "f", label: "F", memberIds: ["a", "b", "c"], position: [0, 0], collapsed: false }],
    lastSelectionIds: ["a", "b"],
  };
  return { spec, vs };
}

describe("applyDelete atomicity", () => {
  it("removes node and cascades incident edges", () => {
    const { spec, vs } = fixture();
    const r = applyDelete(spec, vs, ["a"], []);
    expect(spec.nodes.map((n) => n.id)).toEqual(["b", "c"]);
    expect(spec.edges.map((e) => e.id)).toEqual(["bc"]);
    expect(r.removedEdgeIds.has("ab")).toBe(true);
    expect(r.removedEdgeIds.has("ac")).toBe(true);
  });

  it("scrubs deleted node from timing.fires and timing.state keys", () => {
    const { spec, vs } = fixture();
    applyDelete(spec, vs, ["a"], []);
    expect(spec.timing!.steps[0].fires).toEqual(["b", "c"]);
    expect(spec.timing!.steps[0].state!.a).toBeUndefined();
    expect(Object.keys(spec.timing!.steps[0].state!)).toEqual(["b", "c"]);
  });

  it("scrubs cascaded edges from timing.departs and timing.arrives", () => {
    const { spec, vs } = fixture();
    applyDelete(spec, vs, ["a"], []);
    expect(spec.timing!.steps[0].departs).toEqual(["bc"]);
    expect(spec.timing!.steps[0].arrives).toEqual(["bc"]);
  });

  it("scrubs deleted node from view.nodeIds, fold.memberIds, lastSelectionIds", () => {
    const { spec, vs } = fixture();
    applyDelete(spec, vs, ["a"], []);
    expect(vs.views![0].nodeIds).toEqual(["b", "c"]);
    expect(vs.folds![0].memberIds).toEqual(["b", "c"]);
    expect(vs.lastSelectionIds).toEqual(["b"]);
  });

  it("clears lastSelectionIds when emptied", () => {
    const { spec, vs } = fixture();
    applyDelete(spec, vs, ["a", "b"], []);
    expect(vs.lastSelectionIds).toBeUndefined();
  });

  it("removes only the named edge when no nodes are deleted", () => {
    const { spec, vs } = fixture();
    applyDelete(spec, vs, [], ["ab"]);
    expect(spec.nodes.map((n) => n.id)).toEqual(["a", "b", "c"]);
    expect(spec.edges.map((e) => e.id)).toEqual(["bc", "ac"]);
    expect(spec.timing!.steps[0].departs).toEqual(["bc", "ac"]);
  });

  it("is a no-op when nothing is deleted", () => {
    const { spec, vs } = fixture();
    const before = JSON.stringify({ spec, vs });
    applyDelete(spec, vs, [], []);
    expect(JSON.stringify({ spec, vs })).toBe(before);
  });
});
