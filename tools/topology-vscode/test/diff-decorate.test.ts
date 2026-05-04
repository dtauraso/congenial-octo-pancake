// Tier 2 unit test for decorateForCompare's fold-diff badge counts.
// Locks down the rule: when a fold is collapsed, member-level diff signals
// (added / removed / moved) get tallied onto the fold node's data so the
// collapsed placeholder can render a badge.

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
  it("tallies added/removed/moved members onto a collapsed fold", () => {
    const visible = spec([
      { id: "a", type: "Generic", x: 0, y: 0 },
      { id: "b", type: "Generic", x: 100, y: 0 }, // moved (was at 200)
      { id: "c", type: "Generic", x: 300, y: 0 }, // added
    ]);
    const other = spec([
      { id: "a", type: "Generic", x: 0, y: 0 },
      { id: "b", type: "Generic", x: 200, y: 0 },
      { id: "d", type: "Generic", x: 400, y: 0 }, // removed
    ]);
    const folds = [fold({ memberIds: ["b", "c", "d"], collapsed: true })];
    const { nodes } = decorateForCompare(visible, other, folds);
    const f = nodes.find((n) => n.id === "f1");
    expect(f).toBeTruthy();
    expect((f!.data as { diffCounts?: unknown }).diffCounts).toEqual({
      added: 1, removed: 1, moved: 1,
    });
  });

  it("does not attach diffCounts to expanded folds", () => {
    const visible = spec([
      { id: "a", type: "Generic", x: 0, y: 0 },
      { id: "b", type: "Generic", x: 100, y: 0 },
    ]);
    const other = spec([
      { id: "a", type: "Generic", x: 0, y: 0 },
      { id: "b", type: "Generic", x: 200, y: 0 },
    ]);
    const folds = [fold({ memberIds: ["b"], collapsed: false })];
    const { nodes } = decorateForCompare(visible, other, folds);
    const f = nodes.find((n) => n.id === "f1");
    expect(f).toBeTruthy();
    expect((f!.data as { diffCounts?: unknown }).diffCounts).toBeUndefined();
  });

  it("omits diffCounts when no members differ", () => {
    const visible = spec([
      { id: "a", type: "Generic", x: 0, y: 0 },
      { id: "b", type: "Generic", x: 100, y: 0 },
    ]);
    const other = spec([
      { id: "a", type: "Generic", x: 0, y: 0 },
      { id: "b", type: "Generic", x: 100, y: 0 },
    ]);
    const folds = [fold({ memberIds: ["b"], collapsed: true })];
    const { nodes } = decorateForCompare(visible, other, folds);
    const f = nodes.find((n) => n.id === "f1");
    expect((f!.data as { diffCounts?: unknown }).diffCounts).toBeUndefined();
  });
});
