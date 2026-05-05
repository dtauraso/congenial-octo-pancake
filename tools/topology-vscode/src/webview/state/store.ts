import { create } from "zustand";
import type { Node, Spec } from "../../schema";
import type { RunStatus } from "../../messages";
import type { TraceEvent } from "../../sim/trace";
import { DEFAULT_VIEWER_STATE, type ViewerState } from "../viewerState";

// Webview-local: idle is the pre-first-run default. The wire RunStatus has
// no idle variant (the host only emits running/ok/error/cancelled).
export type RunStatusUI = RunStatus | { state: "idle" };

export type TraceState = {
  loaded: TraceEvent[] | null;
  name: string;
  drift: string;
};

// Bounded snapshot stacks. Spec/viewer are treated as immutable (immer
// produces a fresh tree per edit), so pushing the prior reference is
// enough — no extra cloning needed. Cap is generous; the failure mode if
// it filled would be losing the oldest history, not corruption.
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
  trace: TraceState;
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
  trace: { loaded: null, name: "", drift: "" },
}));

// Live module-level bindings kept in sync with the store. Non-React
// modules (save.ts, views.ts, geom.ts, etc.) import these directly and
// rely on ES-module live-binding semantics to see updates.
export let spec: Spec = useStore.getState().spec;
export let viewerState: ViewerState = useStore.getState().viewerState;
export const view: View = { ...useStore.getState().view };
export const nodeById = new Map<string, Node>();

useStore.subscribe((s) => {
  if (s.spec !== spec) {
    spec = s.spec;
    nodeById.clear();
    for (const n of s.spec.nodes) nodeById.set(n.id, n);
  }
  if (s.viewerState !== viewerState) viewerState = s.viewerState;
  if (s.view.x !== view.x || s.view.y !== view.y || s.view.w !== view.w || s.view.h !== view.h) {
    view.x = s.view.x; view.y = s.view.y; view.w = s.view.w; view.h = s.view.h;
  }
});

export const SVG_NS = "http://www.w3.org/2000/svg";

export function withCap<T>(arr: T[], entry: T): T[] {
  const next = [...arr, entry];
  if (next.length > UNDO_LIMIT) next.shift();
  return next;
}
