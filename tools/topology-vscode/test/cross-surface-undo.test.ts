// Phase 8 closeout — cross-surface undo for rename + node-delete.
//
// Both ops mutate spec AND viewer state atomically. mutateBoth pushes a
// txnId-tagged entry on each stack so a single Cmd-Z (undoSpec or
// undoViewer) cascades the sibling pop and reverses the entire user
// action in one step.

import { describe, expect, it, beforeEach } from "vitest";
import {
  canRedoSpec,
  canRedoViewer,
  canUndoSpec,
  canUndoViewer,
  clearSpecHistory,
  clearViewerHistory,
  getSpec,
  mutateBoth,
  mutateSpec,
  mutateViewer,
  redoSpec,
  redoViewer,
  setSpec,
  setViewerState,
  undoSpec,
  undoViewer,
  viewerState,
} from "../src/webview/state";
import { applyRename } from "../src/webview/rename-core";
import { applyDelete } from "../src/webview/delete-core";
import type { Spec } from "../src/schema";
import type { ViewerState } from "../src/webview/viewerState";

const initial: Spec = {
  nodes: [
    { id: "in", type: "Input", x: 0, y: 0 },
    { id: "rl", type: "ReadLatch", x: 1, y: 0 },
  ],
  edges: [{ id: "e1", source: "in", target: "rl" }],
};

const baseViewer: ViewerState = {
  folds: [{ id: "f1", label: "x", memberIds: ["in", "rl"], position: [0, 0], collapsed: false }],
  views: [{ name: "v1", nodeIds: ["in", "rl"] }],
  bookmarks: [{ name: "b1", startNodeId: "in", cycle: 3 }],
  lastSelectionIds: ["in"],
};

beforeEach(() => {
  setSpec(structuredClone(initial));
  setViewerState(structuredClone(baseViewer));
  clearSpecHistory();
  clearViewerHistory();
});

describe("cross-surface undo (rename)", () => {
  it("undoSpec restores both surfaces and cascades viewer pop", () => {
    const specBefore = JSON.stringify(getSpec());
    const viewerBefore = JSON.stringify(viewerState);
    mutateBoth((s, v) => { applyRename(s, v, "in", "in2"); });
    expect(getSpec().nodes[0].id).toBe("in2");
    expect(getSpec().edges[0].source).toBe("in2");
    expect(viewerState.views?.[0].nodeIds).toContain("in2");
    expect(viewerState.folds?.[0].memberIds).toContain("in2");
    expect(viewerState.lastSelectionIds).toEqual(["in2"]);

    undoSpec();
    expect(JSON.stringify(getSpec())).toBe(specBefore);
    expect(JSON.stringify(viewerState)).toBe(viewerBefore);
    expect(canUndoSpec()).toBe(false);
    expect(canUndoViewer()).toBe(false);
  });

  it("undoViewer also cascades (symmetry)", () => {
    const specBefore = JSON.stringify(getSpec());
    const viewerBefore = JSON.stringify(viewerState);
    mutateBoth((s, v) => { applyRename(s, v, "in", "in2"); });
    undoViewer();
    expect(JSON.stringify(getSpec())).toBe(specBefore);
    expect(JSON.stringify(viewerState)).toBe(viewerBefore);
  });

  it("redoSpec re-applies both surfaces", () => {
    mutateBoth((s, v) => { applyRename(s, v, "in", "in2"); });
    const specAfter = JSON.stringify(getSpec());
    const viewerAfter = JSON.stringify(viewerState);
    undoSpec();
    expect(canRedoSpec()).toBe(true);
    expect(canRedoViewer()).toBe(true);
    redoSpec();
    expect(JSON.stringify(getSpec())).toBe(specAfter);
    expect(JSON.stringify(viewerState)).toBe(viewerAfter);
  });
});

describe("cross-surface undo (node delete)", () => {
  it("undoSpec restores spec node, edges, and viewer membership", () => {
    const specBefore = JSON.stringify(getSpec());
    const viewerBefore = JSON.stringify(viewerState);
    mutateBoth((s, v) => { applyDelete(s, v, ["in"], []); });
    expect(getSpec().nodes.find((n) => n.id === "in")).toBeUndefined();
    expect(getSpec().edges.length).toBe(0); // incident edge cascaded
    expect(viewerState.views?.[0].nodeIds).not.toContain("in");
    expect(viewerState.folds?.[0].memberIds).not.toContain("in");

    undoSpec();
    expect(JSON.stringify(getSpec())).toBe(specBefore);
    expect(JSON.stringify(viewerState)).toBe(viewerBefore);
  });
});

describe("cross-surface undo (edge cases)", () => {
  it("a no-op mutateBoth pushes nothing", () => {
    mutateBoth((_s, _v) => { /* no change */ });
    expect(canUndoSpec()).toBe(false);
    expect(canUndoViewer()).toBe(false);
  });

  it("interleaved single-surface + cross-surface edits unwind in correct order", () => {
    mutateViewer((s) => { s.bookmarks = [...(s.bookmarks ?? []), { name: "b2", startNodeId: "rl", cycle: 5 }]; });
    const afterViewerOnly = JSON.stringify(viewerState);
    mutateBoth((s, v) => { applyRename(s, v, "in", "in2"); });
    mutateSpec((s) => { s.nodes.push({ id: "x", type: "Input", x: 5, y: 5 }); });

    // Undo the spec-only add.
    undoSpec();
    expect(getSpec().nodes.find((n) => n.id === "x")).toBeUndefined();
    expect(getSpec().nodes.find((n) => n.id === "in2")).toBeDefined();
    expect(JSON.stringify(viewerState)).not.toBe(afterViewerOnly); // still has rename applied

    // Undo the cross-surface rename — cascades viewer pop.
    undoSpec();
    expect(getSpec().nodes.find((n) => n.id === "in")).toBeDefined();
    expect(JSON.stringify(viewerState)).toBe(afterViewerOnly);

    // The viewer-only bookmark add is still undoable.
    expect(canUndoViewer()).toBe(true);
    undoViewer();
    expect(viewerState.bookmarks?.length).toBe(1);
  });

  it("plain mutateSpec leaves viewer history depth unchanged (regression)", () => {
    mutateViewer((s) => { s.bookmarks = [...(s.bookmarks ?? []), { name: "b2", startNodeId: "rl", cycle: 5 }]; });
    expect(canUndoViewer()).toBe(true);
    mutateSpec((s) => { s.nodes.push({ id: "x", type: "Input", x: 5, y: 5 }); });
    undoSpec();
    // Viewer side untouched — no cascade because the spec entry has no txnId.
    expect(canUndoViewer()).toBe(true);
    expect(canRedoViewer()).toBe(false);
  });
});
