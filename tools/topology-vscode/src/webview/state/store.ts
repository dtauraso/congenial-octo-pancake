import { create } from "zustand";
import type { Node, Spec } from "../../schema";
import type { RunStatus } from "../../messages";
import { DEFAULT_VIEWER_STATE, type ViewerState } from "./viewer/types";

// Webview-local: idle is the pre-first-run default. The wire RunStatus has
// no idle variant (the host only emits running/ok/error/cancelled).
export type RunStatusUI = RunStatus | { state: "idle" };

// Bounded snapshot stacks. Spec/viewer are treated as immutable (immer
// produces a fresh tree per edit), so pushing the prior reference is
// enough — no extra cloning needed. Cap is generous; the failure mode if
// it filled would be losing the oldest history, not corruption.
// NOTE (phase-3 migration): the undo/redo hotkeys were moved to rf/history.ts
// (RF-snapshot-based). These Zustand stacks are no longer wired to any
// keyboard handler; they stay in place pending a cleanup commit.
export const UNDO_LIMIT = 50;
export type SpecEntry = { snapshot: Spec; txnId?: number };
export type ViewerEntry = { snapshot: ViewerState; txnId?: number };

export type View = { x: number; y: number; w: number; h: number };
export type Scope = "spec" | "viewer";

interface Store {
  spec: Spec;
  viewerState: ViewerState;
  view: View;
  undoStack: SpecEntry[];
  redoStack: SpecEntry[];
  viewerUndoStack: ViewerEntry[];
  viewerRedoStack: ViewerEntry[];
  nextTxnId: number;
  lastScope: Scope;
  dimmed: Set<string> | null;
  runStatus: RunStatusUI;
}

export const useStore = create<Store>(() => ({
  spec: { nodes: [], edges: [] },
  viewerState: { ...DEFAULT_VIEWER_STATE },
  view: { x: 0, y: 0, w: 1380, h: 740 },
  undoStack: [],
  redoStack: [],
  viewerUndoStack: [],
  viewerRedoStack: [],
  nextTxnId: 1,
  lastScope: "spec",
  dimmed: null,
  runStatus: { state: "idle" },
}));

// Live module-level bindings kept in sync with the store. Non-React
// modules (save.ts, views.ts, etc.) import these directly and
// rely on ES-module live-binding semantics to see updates.
export let spec: Spec = useStore.getState().spec;
export let viewerState: ViewerState = useStore.getState().viewerState;
export const nodeById = new Map<string, Node>();

useStore.subscribe((s) => {
  if (s.spec !== spec) {
    spec = s.spec;
    nodeById.clear();
    for (const n of s.spec.nodes) nodeById.set(n.id, n);
  }
  if (s.viewerState !== viewerState) viewerState = s.viewerState;
});

export function withCap<T>(arr: T[], entry: T): T[] {
  const next = [...arr, entry];
  if (next.length > UNDO_LIMIT) next.shift();
  return next;
}
