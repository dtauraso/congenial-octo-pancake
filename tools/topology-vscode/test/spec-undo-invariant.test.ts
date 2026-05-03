// Phase 8 Chunk 1 — Tier 2 invariant: spec undo/redo only touches the spec.
//
// Two surfaces share the editor: spec (topology.json) and viewer state
// (folds, saved views, bookmarks, camera). The undo/redo stacks are
// scoped to their own surface — a spec undo must not mutate viewer state,
// and vice versa. This test pins the spec-side direction: drive a few
// mutateSpec edits, then walk undo/redo across them and assert the
// viewer-state JSON is byte-identical at every step.

import { describe, expect, it, beforeEach } from "vitest";
import {
  canRedoSpec,
  canRedoViewer,
  canUndoSpec,
  canUndoViewer,
  clearSpecHistory,
  clearViewerHistory,
  getSpec,
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
import type { Spec } from "../src/schema";
import type { ViewerState } from "../src/webview/viewerState";

const initial: Spec = {
  nodes: [{ id: "in", type: "Input", x: 0, y: 0 }],
  edges: [],
};

const baseViewer: ViewerState = {
  folds: [{ id: "f1", label: "x", memberIds: ["in"], position: [0, 0], collapsed: false }],
  views: [{ name: "v1", nodeIds: ["in"] }],
  bookmarks: [{ name: "b1", startNodeId: "in", cycle: 3 }],
  lastSelectionIds: ["in"],
};

beforeEach(() => {
  setSpec(structuredClone(initial));
  setViewerState(structuredClone(baseViewer));
  clearSpecHistory();
  clearViewerHistory();
});

describe("spec undo/redo (Tier 2)", () => {
  it("undo restores prior spec byte-for-byte", () => {
    const before = JSON.stringify(getSpec());
    mutateSpec((s) => { s.nodes.push({ id: "rl", type: "ReadLatch", x: 1, y: 0 }); });
    expect(JSON.stringify(getSpec())).not.toBe(before);
    expect(canUndoSpec()).toBe(true);
    undoSpec();
    expect(JSON.stringify(getSpec())).toBe(before);
  });

  it("redo replays the undone edit", () => {
    mutateSpec((s) => { s.nodes.push({ id: "rl", type: "ReadLatch", x: 1, y: 0 }); });
    const after = JSON.stringify(getSpec());
    undoSpec();
    expect(canRedoSpec()).toBe(true);
    redoSpec();
    expect(JSON.stringify(getSpec())).toBe(after);
  });

  it("a fresh mutation clears the redo stack", () => {
    mutateSpec((s) => { s.nodes.push({ id: "a", type: "Input", x: 1, y: 0 }); });
    undoSpec();
    expect(canRedoSpec()).toBe(true);
    mutateSpec((s) => { s.nodes.push({ id: "b", type: "Input", x: 2, y: 0 }); });
    expect(canRedoSpec()).toBe(false);
  });

  it("undo/redo does not touch viewer state", () => {
    const viewerBefore = JSON.stringify(viewerState);
    mutateSpec((s) => { s.nodes.push({ id: "rl", type: "ReadLatch", x: 1, y: 0 }); });
    expect(JSON.stringify(viewerState)).toBe(viewerBefore);
    undoSpec();
    expect(JSON.stringify(viewerState)).toBe(viewerBefore);
    redoSpec();
    expect(JSON.stringify(viewerState)).toBe(viewerBefore);
  });

  it("undo on an empty stack is a no-op", () => {
    const before = JSON.stringify(getSpec());
    expect(undoSpec()).toBeNull();
    expect(JSON.stringify(getSpec())).toBe(before);
  });
});

describe("viewer undo/redo (Tier 2)", () => {
  it("viewer undo restores prior viewer state byte-for-byte", () => {
    const before = JSON.stringify(viewerState);
    mutateViewer((s) => {
      s.views = [...(s.views ?? []), { name: "v2", nodeIds: ["in"] }];
    });
    expect(JSON.stringify(viewerState)).not.toBe(before);
    expect(canUndoViewer()).toBe(true);
    undoViewer();
    expect(JSON.stringify(viewerState)).toBe(before);
  });

  it("viewer undo/redo does not touch the spec", () => {
    const specBefore = JSON.stringify(getSpec());
    mutateViewer((s) => { s.bookmarks = [{ name: "b2", startNodeId: "in", cycle: 9 }]; });
    expect(JSON.stringify(getSpec())).toBe(specBefore);
    undoViewer();
    expect(JSON.stringify(getSpec())).toBe(specBefore);
    redoViewer();
    expect(JSON.stringify(getSpec())).toBe(specBefore);
  });

  it("viewer redo replays the undone edit", () => {
    mutateViewer((s) => { s.bookmarks = [{ name: "b2", startNodeId: "in", cycle: 9 }]; });
    const after = JSON.stringify(viewerState);
    undoViewer();
    expect(canRedoViewer()).toBe(true);
    redoViewer();
    expect(JSON.stringify(viewerState)).toBe(after);
  });

  it("a no-op viewer mutation is not pushed onto the stack", () => {
    expect(canUndoViewer()).toBe(false);
    mutateViewer((_s) => { /* no change */ });
    expect(canUndoViewer()).toBe(false);
  });

  it("the two stacks are independent — spec mutation leaves viewer history alone", () => {
    mutateViewer((s) => { s.views = [...(s.views ?? []), { name: "v3", nodeIds: ["in"] }]; });
    const viewerBefore = JSON.stringify(viewerState);
    mutateSpec((s) => { s.nodes.push({ id: "rl", type: "ReadLatch", x: 1, y: 0 }); });
    undoSpec();
    // Spec was rolled back, but viewer history must be exactly where the
    // viewer mutation left it — both content and stack depth.
    expect(JSON.stringify(viewerState)).toBe(viewerBefore);
    expect(canUndoViewer()).toBe(true);
    expect(canRedoViewer()).toBe(false);
  });
});
