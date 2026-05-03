import type { Node, Spec } from "../schema";
import { DEFAULT_VIEWER_STATE, type ViewerState } from "./viewerState";

export const SVG_NS = "http://www.w3.org/2000/svg";

export let spec: Spec = { nodes: [], edges: [] };
export function getSpec(): Spec {
  return spec;
}
export function setSpec(next: Spec) {
  spec = next;
  nodeById.clear();
  for (const n of next.nodes) nodeById.set(n.id, n);
}

// Treat the live spec as immutable: every edit produces a fresh top-level
// object via structuredClone, mutators run on the clone, then setSpec swaps
// the module reference. This keeps reference equality changing on every
// edit so future React useEffect([spec]) hooks fire correctly, and rules
// out the entire class of "stale pointer into the old spec" bugs.
export function mutateSpec(fn: (s: Spec) => void): Spec {
  const next = structuredClone(spec);
  fn(next);
  pushSpecUndo({ snapshot: spec });
  setSpec(next);
  return next;
}

// Bounded snapshot stacks. Spec is treated as immutable (mutateSpec swaps
// the reference on every edit), so pushing the prior reference is enough —
// no extra cloning needed. Cap is generous; the failure mode if it filled
// would be losing the oldest history, not corruption.
const UNDO_LIMIT = 50;
type SpecEntry = { snapshot: Spec; txnId?: number };
type ViewerEntry = { snapshot: ViewerState; txnId?: number };
const undoStack: SpecEntry[] = [];
const redoStack: SpecEntry[] = [];

function pushSpecUndo(entry: SpecEntry) {
  undoStack.push(entry);
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  redoStack.length = 0;
}

export function undoSpec(): Spec | null {
  const prev = undoStack.pop();
  if (!prev) return null;
  redoStack.push({ snapshot: spec, txnId: prev.txnId });
  setSpec(prev.snapshot);
  // Cross-surface (mutateBoth) edits tag both stack entries with the same
  // txnId so a single Cmd-Z reverses the whole user action.
  if (prev.txnId !== undefined) {
    const top = viewerUndoStack[viewerUndoStack.length - 1];
    if (top && top.txnId === prev.txnId) {
      viewerUndoStack.pop();
      viewerRedoStack.push({ snapshot: viewerState, txnId: top.txnId });
      setViewerState(top.snapshot);
    }
  }
  return prev.snapshot;
}

export function redoSpec(): Spec | null {
  const next = redoStack.pop();
  if (!next) return null;
  undoStack.push({ snapshot: spec, txnId: next.txnId });
  setSpec(next.snapshot);
  if (next.txnId !== undefined) {
    const top = viewerRedoStack[viewerRedoStack.length - 1];
    if (top && top.txnId === next.txnId) {
      viewerRedoStack.pop();
      viewerUndoStack.push({ snapshot: viewerState, txnId: top.txnId });
      setViewerState(top.snapshot);
    }
  }
  return next.snapshot;
}

export function clearSpecHistory() {
  undoStack.length = 0;
  redoStack.length = 0;
}

export function canUndoSpec(): boolean { return undoStack.length > 0; }
export function canRedoSpec(): boolean { return redoStack.length > 0; }

export const view = { x: 0, y: 0, w: 1380, h: 740 };

export let viewerState: ViewerState = { ...DEFAULT_VIEWER_STATE };
export function setViewerState(next: ViewerState) {
  viewerState = next;
}

// Viewer-side history is independent of the spec stack — phase-8.md
// requires the two surfaces' undo histories never bleed. Only deliberate
// creations (folds, saved views, bookmarks) flow through mutateViewer.
// Camera pan, lastSelectionIds, and the active-view dim mask are
// incidental tracking and bypass it.
const viewerUndoStack: ViewerEntry[] = [];
const viewerRedoStack: ViewerEntry[] = [];

function pushViewerUndo(entry: ViewerEntry) {
  viewerUndoStack.push(entry);
  if (viewerUndoStack.length > UNDO_LIMIT) viewerUndoStack.shift();
  viewerRedoStack.length = 0;
}

export function mutateViewer<T>(fn: (v: ViewerState) => T): T {
  const next = structuredClone(viewerState);
  const result = fn(next);
  // Skip the history push when fn produced no observable change. Viewer
  // operations have validation paths that can early-return (createFold
  // rejects overlap, etc.); without this, those rejections still leave a
  // no-op entry on the stack that the user has to undo through.
  if (JSON.stringify(next) === JSON.stringify(viewerState)) return result;
  pushViewerUndo({ snapshot: viewerState });
  setViewerState(next);
  return result;
}

export function undoViewer(): ViewerState | null {
  const prev = viewerUndoStack.pop();
  if (!prev) return null;
  viewerRedoStack.push({ snapshot: viewerState, txnId: prev.txnId });
  setViewerState(prev.snapshot);
  if (prev.txnId !== undefined) {
    const top = undoStack[undoStack.length - 1];
    if (top && top.txnId === prev.txnId) {
      undoStack.pop();
      redoStack.push({ snapshot: spec, txnId: top.txnId });
      setSpec(top.snapshot);
    }
  }
  return prev.snapshot;
}

export function redoViewer(): ViewerState | null {
  const next = viewerRedoStack.pop();
  if (!next) return null;
  viewerUndoStack.push({ snapshot: viewerState, txnId: next.txnId });
  setViewerState(next.snapshot);
  if (next.txnId !== undefined) {
    const top = redoStack[redoStack.length - 1];
    if (top && top.txnId === next.txnId) {
      redoStack.pop();
      undoStack.push({ snapshot: spec, txnId: top.txnId });
      setSpec(top.snapshot);
    }
  }
  return next.snapshot;
}

// Cross-surface mutation: rename + node-delete touch spec AND viewer state
// atomically (edge endpoints + view/fold membership). Push a paired entry
// onto both undo stacks tagged with a shared txnId; undoSpec/undoViewer
// cascade so a single Cmd-Z reverses the whole user action. No-ops on
// either side are still pushed as a pair to keep the txnId pairing
// invariant simple — restoring an unchanged side to itself is harmless.
let nextTxnId = 1;
export function mutateBoth<T>(fn: (s: Spec, v: ViewerState) => T): T {
  const nextSpec = structuredClone(spec);
  const nextViewer = structuredClone(viewerState);
  const result = fn(nextSpec, nextViewer);
  const viewerChanged = JSON.stringify(nextViewer) !== JSON.stringify(viewerState);
  const specChanged = JSON.stringify(nextSpec) !== JSON.stringify(spec);
  if (!specChanged && !viewerChanged) return result;
  const txnId = nextTxnId++;
  pushSpecUndo({ snapshot: spec, txnId });
  pushViewerUndo({ snapshot: viewerState, txnId });
  setSpec(nextSpec);
  setViewerState(nextViewer);
  return result;
}

export function clearViewerHistory() {
  viewerUndoStack.length = 0;
  viewerRedoStack.length = 0;
}

export function canUndoViewer(): boolean { return viewerUndoStack.length > 0; }
export function canRedoViewer(): boolean { return viewerRedoStack.length > 0; }

export const nodeById = new Map<string, Node>();
