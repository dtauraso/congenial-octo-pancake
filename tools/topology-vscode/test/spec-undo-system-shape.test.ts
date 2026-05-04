// Phase 8 Chunk 3 — Tier 3 system-shape: interleaved spec + viewer
// mutations stay scoped to their own undo stack.
//
// Apply a sequence of edits that crosses the two surfaces, then walk
// each scope's undo stack independently and assert the *other* surface
// stays byte-identical at every step. The expensive bug this catches:
// a viewer mutation that incidentally pushes onto the spec stack (or
// vice versa) would let a spec-undo silently roll back fold creation,
// or a viewer-undo silently roll back an edge-kind edit. Standalone
// per-stack tests don't reach that interaction.
//
// Mutations are confined to surface-clean ops on purpose: rename and
// delete touch *both* spec and viewer state in a single gesture, and
// the current two-stack design doesn't atomically capture cross-surface
// undo. Documented as a follow-up gap; the system-shape test guards
// the clean-op contract that is shipped today.

import { describe, expect, it, beforeEach } from "vitest";
import {
  clearSpecHistory,
  clearViewerHistory,
  getSpec,
  mutateSpec,
  mutateViewer,
  setSpec,
  setViewerState,
  undoSpec,
  undoViewer,
  viewerState,
} from "../src/webview/state";
import { createFold } from "../src/webview/fold-core";
import type { Spec, Edge } from "../src/schema";
import type { ViewerState } from "../src/webview/viewerState";

function edge(id: string, source: string, target: string, kind: Edge["kind"] = "chain"): Edge {
  return { id, source, sourceHandle: "out", target, targetHandle: "in", kind };
}

const initialSpec: Spec = {
  nodes: [
    { id: "a", type: "Input", x: 0, y: 0 },
    { id: "b", type: "ReadLatch", x: 1, y: 0 },
    { id: "c", type: "ChainInhibitor", x: 2, y: 0 },
  ],
  edges: [edge("aToB", "a", "b"), edge("bToC", "b", "c")],
};

const initialViewer: ViewerState = {};

beforeEach(() => {
  setSpec(structuredClone(initialSpec));
  setViewerState(structuredClone(initialViewer));
  clearSpecHistory();
  clearViewerHistory();
});

describe("system-shape: interleaved spec + viewer undo (Tier 3)", () => {
  it("crossed sequence rolls back per-scope without bleeding", () => {
    const specInit = JSON.stringify(getSpec());
    const viewerInit = JSON.stringify(viewerState);

    // 1. spec edit: change aToB kind chain → signal
    mutateSpec((s) => { const e = s.edges.find((x) => x.id === "aToB"); if (e) e.kind = "signal"; });
    const viewerAfter1 = JSON.stringify(viewerState);
    expect(viewerAfter1).toBe(viewerInit);

    // 2. viewer edit: fold {b,c}
    const foldId = mutateViewer((s) => createFold(s, ["b", "c"], [1.5, 0], "bc"));
    expect(foldId).toBeTruthy();
    const specAfter2 = JSON.stringify(getSpec());

    // 3. spec edit: change aToB kind back to chain
    mutateSpec((s) => { const e = s.edges.find((x) => x.id === "aToB"); if (e) e.kind = "chain"; });
    const viewerAfter3 = JSON.stringify(viewerState);
    // Viewer state has not moved since step 2 — fold still present.
    expect(viewerAfter3).toBe(JSON.stringify({ folds: [
      { id: foldId, label: "bc", memberIds: ["b", "c"], position: [1.5, 0], collapsed: true },
    ] }));

    // 4. viewer edit: delete the fold (folds array becomes []).
    mutateViewer((s) => { s.folds = (s.folds ?? []).filter((f) => f.id !== foldId); });
    const viewerAfter4 = JSON.stringify(viewerState);
    const foldedViewer = JSON.stringify({ folds: [
      { id: foldId, label: "bc", memberIds: ["b", "c"], position: [1.5, 0], collapsed: true },
    ] });

    // Walk SPEC undo back twice. Viewer history depth/contents untouched.
    undoSpec();
    expect(JSON.stringify(viewerState)).toBe(viewerAfter4);
    undoSpec();
    expect(JSON.stringify(getSpec())).toBe(specInit);
    expect(JSON.stringify(viewerState)).toBe(viewerAfter4);

    // Walk VIEWER undo back twice. Spec stays drained at specInit; viewer
    // unwinds delete → fold-present, then create → initial-no-folds.
    undoViewer();
    expect(JSON.stringify(getSpec())).toBe(specInit);
    expect(JSON.stringify(viewerState)).toBe(foldedViewer);
    undoViewer();
    expect(JSON.stringify(getSpec())).toBe(specInit);
    expect(JSON.stringify(viewerState)).toBe(viewerInit);

    void specAfter2;
  });

  it("a spec rollback that drains the spec stack does not leave the viewer stack pointing at a phantom state", () => {
    // Regression guard for "fold pointing at a now-restored node id
    // incoherently" (phase-8.md chunk-5 wording). Here we exercise a
    // narrower form: after a spec-only undo, every viewer-state
    // memberIds reference must still resolve in the live spec.
    mutateSpec((s) => { s.nodes.push({ id: "d", type: "Input", x: 3, y: 0 }); });
    mutateViewer((s) => createFold(s, ["a", "b"], [0.5, 0], "ab"));
    undoSpec(); // drops node d; fold still references a,b which exist
    const liveIds = new Set(getSpec().nodes.map((n) => n.id));
    for (const f of viewerState.folds ?? []) {
      for (const m of f.memberIds) {
        expect(liveIds.has(m)).toBe(true);
      }
    }
  });
});
