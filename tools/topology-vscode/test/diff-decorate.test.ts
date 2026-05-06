// Tier 2 unit test for decorateForCompare's fold-diff badge counts.
// Locks down the rule: when a fold is collapsed, member-level diff signals
// (added / removed) get tallied onto the fold node's data so the
// collapsed placeholder can render a badge.
// Note: "moved" is always 0 since positions live in view (topology.view.json),
// not spec — spec-level diff has no position information.

import { describe, expect, it } from "vitest";
import { parseSpec, type Spec } from "../src/schema";
import type { Fold } from "../src/webview/viewerState";
import { decorateForCompare } from "../src/webview/rf/diff-decorate";

function spec(nodes: Spec["nodes"], edges: Spec["edges"] = []): Spec {
  return parseSpec({ nodes, edges });
}

const fold = (overrides: Partial<Fold>): Fold => ({
  id: "f1",
  label: "f1",
  memberIds: [],
  position: [0, 0],
  collapsed: true,
  ...overrides,
});

describe("decorateForCompare — collapsed fold diff counts", () => {
  it("tallies added/removed members onto a collapsed fold", () => {
    const visible = spec([
      { id: "a", type: "Generic" },
      { id: "b", type: "Generic" },
      { id: "c", type: "Generic" }, // added
    ]);
    const other = spec([
      { id: "a", type: "Generic" },
      { id: "b", type: "Generic" },
      { id: "d", type: "Generic" }, // removed
    ]);
    const folds = [fold({ memberIds: ["b", "c", "d"], collapsed: true })];
    const { nodes } = decorateForCompare(visible, other, folds);
    const f = nodes.find((n) => n.id === "f1");
    expect(f).toBeTruthy();
    expect((f!.data as { diffCounts?: unknown }).diffCounts).toEqual({
      added: 1, removed: 1, moved: 0,
    });
  });

  it("does not attach diffCounts to expanded folds", () => {
    const visible = spec([
      { id: "a", type: "Generic" },
      { id: "b", type: "Generic" },
    ]);
    const other = spec([
      { id: "a", type: "Generic" },
      { id: "b", type: "Generic" },
    ]);
    const folds = [fold({ memberIds: ["b"], collapsed: false })];
    const { nodes } = decorateForCompare(visible, other, folds);
    const f = nodes.find((n) => n.id === "f1");
    expect(f).toBeTruthy();
    expect((f!.data as { diffCounts?: unknown }).diffCounts).toBeUndefined();
  });

  it("omits diffCounts when no members differ", () => {
    const visible = spec([
      { id: "a", type: "Generic" },
      { id: "b", type: "Generic" },
    ]);
    const other = spec([
      { id: "a", type: "Generic" },
      { id: "b", type: "Generic" },
    ]);
    const folds = [fold({ memberIds: ["b"], collapsed: true })];
    const { nodes } = decorateForCompare(visible, other, folds);
    const f = nodes.find((n) => n.id === "f1");
    expect((f!.data as { diffCounts?: unknown }).diffCounts).toBeUndefined();
  });

  it("preserves member positions from viewerState (no (0,0) fallback)", () => {
    // Regression: previously specToFlow was called with `{}`, so member
    // positions fell back to (0,0). Symptom: deleting a collapsed fold
    // while compare/onion mode was active stacked all members at the
    // origin, looking like the editor had vanished.
    const visible = spec([
      { id: "a", type: "Generic" },
      { id: "b", type: "Generic" },
    ]);
    const other = spec([{ id: "a", type: "Generic" }]);
    const vs = { nodes: { a: { x: 100, y: 200 }, b: { x: 300, y: 400 } } };
    const { nodes } = decorateForCompare(visible, other, [], vs);
    const a = nodes.find((n) => n.id === "a")!;
    const b = nodes.find((n) => n.id === "b")!;
    expect(a.position).toEqual({ x: 100, y: 200 });
    expect(b.position).toEqual({ x: 300, y: 400 });
  });
});
