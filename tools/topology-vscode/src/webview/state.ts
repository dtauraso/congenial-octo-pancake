import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { produce } from "immer";
import type { Node, Spec } from "../schema";
import type { RunStatus } from "../messages";

// Webview-local: idle is the pre-first-run default. The wire RunStatus has
// no idle variant (the host only emits running/ok/error/cancelled).
export type RunStatusUI = RunStatus | { state: "idle" };
import type { TraceEvent } from "../sim/trace";
import { DEFAULT_VIEWER_STATE, type ViewerState } from "./viewerState";

export const SVG_NS = "http://www.w3.org/2000/svg";

export type TraceState = {
  loaded: TraceEvent[] | null;
  name: string;
  drift: string;
};

// Bounded snapshot stacks. Spec/viewer are treated as immutable (immer
// produces a fresh tree per edit), so pushing the prior reference is
// enough — no extra cloning needed. Cap is generous; the failure mode if
// it filled would be losing the oldest history, not corruption.
const UNDO_LIMIT = 50;
type SpecEntry = { snapshot: Spec; txnId?: number };
type ViewerEntry = { snapshot: ViewerState; txnId?: number };

type View = { x: number; y: number; w: number; h: number };
type Scope = "spec" | "viewer";

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
// rely on ES-module live-binding semantics to see updates. The store is
// the source of truth; these are convenience read-aliases.
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

// ---- Plain getters (non-React) ----
export const getSpec = (): Spec => useStore.getState().spec;
export const getViewerState = (): ViewerState => useStore.getState().viewerState;
export const getView = (): View => useStore.getState().view;
export const getLastScope = (): Scope => useStore.getState().lastScope;

// ---- React selector hooks ----
export const useSpec = (): Spec => useStore((s) => s.spec);
export const useViewerState = (): ViewerState => useStore((s) => s.viewerState);
export const useView = (): View => useStore(useShallow((s) => s.view));
export const useLastScope = (): Scope => useStore((s) => s.lastScope);
export const useUndoState = () =>
  useStore(
    useShallow((s) => ({
      canUndoSpec: s.undoStack.length > 0,
      canRedoSpec: s.redoStack.length > 0,
      canUndoViewer: s.viewerUndoStack.length > 0,
      canRedoViewer: s.viewerRedoStack.length > 0,
    })),
  );

// ---- Setters ----
export function setSpec(next: Spec) {
  useStore.setState({ spec: next });
}
export function setViewerState(next: ViewerState) {
  useStore.setState({ viewerState: next });
}
export function setView(next: View) {
  useStore.setState({ view: { ...next } });
}
export function setLastScope(scope: Scope) {
  if (useStore.getState().lastScope !== scope) useStore.setState({ lastScope: scope });
}

export const useDimmed = (): Set<string> | null => useStore((s) => s.dimmed);
export function setDimmed(next: Set<string> | null) {
  useStore.setState({ dimmed: next });
}

export const useRunStatus = (): RunStatusUI => useStore((s) => s.runStatus);
export function setRunStatus(next: RunStatusUI) {
  useStore.setState({ runStatus: next });
}

export const useTrace = (): TraceState => useStore(useShallow((s) => s.trace));
export function setTrace(next: TraceState) {
  useStore.setState({ trace: next });
}
export function patchTrace(part: Partial<TraceState>) {
  useStore.setState((s) => ({ trace: { ...s.trace, ...part } }));
}

// History-bypassing patch for incidental viewer fields (camera, selection,
// fold position). Distinct from mutateViewer which pushes onto undo.
export function patchViewerState(fn: (v: ViewerState) => void) {
  useStore.setState((s) => ({ viewerState: produce(s.viewerState, fn) }));
}

// ---- History push helpers ----
function withCap<T>(arr: T[], entry: T): T[] {
  const next = [...arr, entry];
  if (next.length > UNDO_LIMIT) next.shift();
  return next;
}

// ---- Mutators ----
export function mutateSpec(fn: (s: Spec) => void): Spec {
  const prev = useStore.getState().spec;
  const next = produce(prev, fn);
  useStore.setState((st) => ({
    spec: next,
    undoStack: withCap(st.undoStack, { snapshot: prev }),
    redoStack: [],
  }));
  return next;
}

export function mutateViewer<T>(fn: (v: ViewerState) => T): T {
  const prev = useStore.getState().viewerState;
  let result!: T;
  const next = produce(prev, (draft) => {
    result = fn(draft) as T;
  });
  // immer returns the same reference when no draft mutations occurred.
  // Skip the history push so validation paths that early-return (createFold
  // rejecting overlap, etc.) don't leave a no-op entry to undo through.
  if (next === prev) return result;
  useStore.setState((st) => ({
    viewerState: next,
    viewerUndoStack: withCap(st.viewerUndoStack, { snapshot: prev }),
    viewerRedoStack: [],
  }));
  return result;
}

// Cross-surface mutation: rename + node-delete touch spec AND viewer state
// atomically (edge endpoints + view/fold membership). Push a paired entry
// onto both undo stacks tagged with a shared txnId; undoSpec/undoViewer
// cascade so a single Cmd-Z reverses the whole user action. No-ops on
// either side are still pushed as a pair to keep the txnId pairing
// invariant simple — restoring an unchanged side to itself is harmless.
export function mutateBoth<T>(fn: (s: Spec, v: ViewerState) => T): T {
  const st = useStore.getState();
  const prevSpec = st.spec;
  const prevViewer = st.viewerState;
  let result!: T;
  let nextViewer: ViewerState = prevViewer;
  const nextSpec = produce(prevSpec, (sd) => {
    nextViewer = produce(prevViewer, (vd) => {
      result = fn(sd, vd) as T;
    });
  });
  const specChanged = nextSpec !== prevSpec;
  const viewerChanged = nextViewer !== prevViewer;
  if (!specChanged && !viewerChanged) return result;
  const txnId = st.nextTxnId;
  useStore.setState({
    spec: nextSpec,
    viewerState: nextViewer,
    undoStack: withCap(st.undoStack, { snapshot: prevSpec, txnId }),
    viewerUndoStack: withCap(st.viewerUndoStack, { snapshot: prevViewer, txnId }),
    redoStack: [],
    viewerRedoStack: [],
    nextTxnId: txnId + 1,
  });
  return result;
}

// ---- Undo / redo ----
export function undoSpec(): Spec | null {
  const st = useStore.getState();
  if (st.undoStack.length === 0) return null;
  const prev = st.undoStack[st.undoStack.length - 1];
  useStore.setState({
    spec: prev.snapshot,
    undoStack: st.undoStack.slice(0, -1),
    redoStack: [...st.redoStack, { snapshot: st.spec, txnId: prev.txnId }],
  });
  if (prev.txnId !== undefined) {
    const st2 = useStore.getState();
    const top = st2.viewerUndoStack[st2.viewerUndoStack.length - 1];
    if (top && top.txnId === prev.txnId) {
      useStore.setState({
        viewerState: top.snapshot,
        viewerUndoStack: st2.viewerUndoStack.slice(0, -1),
        viewerRedoStack: [...st2.viewerRedoStack, { snapshot: st2.viewerState, txnId: top.txnId }],
      });
    }
  }
  return prev.snapshot;
}

export function redoSpec(): Spec | null {
  const st = useStore.getState();
  if (st.redoStack.length === 0) return null;
  const next = st.redoStack[st.redoStack.length - 1];
  useStore.setState({
    spec: next.snapshot,
    redoStack: st.redoStack.slice(0, -1),
    undoStack: [...st.undoStack, { snapshot: st.spec, txnId: next.txnId }],
  });
  if (next.txnId !== undefined) {
    const st2 = useStore.getState();
    const top = st2.viewerRedoStack[st2.viewerRedoStack.length - 1];
    if (top && top.txnId === next.txnId) {
      useStore.setState({
        viewerState: top.snapshot,
        viewerRedoStack: st2.viewerRedoStack.slice(0, -1),
        viewerUndoStack: [...st2.viewerUndoStack, { snapshot: st2.viewerState, txnId: top.txnId }],
      });
    }
  }
  return next.snapshot;
}

export function undoViewer(): ViewerState | null {
  const st = useStore.getState();
  if (st.viewerUndoStack.length === 0) return null;
  const prev = st.viewerUndoStack[st.viewerUndoStack.length - 1];
  useStore.setState({
    viewerState: prev.snapshot,
    viewerUndoStack: st.viewerUndoStack.slice(0, -1),
    viewerRedoStack: [...st.viewerRedoStack, { snapshot: st.viewerState, txnId: prev.txnId }],
  });
  if (prev.txnId !== undefined) {
    const st2 = useStore.getState();
    const top = st2.undoStack[st2.undoStack.length - 1];
    if (top && top.txnId === prev.txnId) {
      useStore.setState({
        spec: top.snapshot,
        undoStack: st2.undoStack.slice(0, -1),
        redoStack: [...st2.redoStack, { snapshot: st2.spec, txnId: top.txnId }],
      });
    }
  }
  return prev.snapshot;
}

export function redoViewer(): ViewerState | null {
  const st = useStore.getState();
  if (st.viewerRedoStack.length === 0) return null;
  const next = st.viewerRedoStack[st.viewerRedoStack.length - 1];
  useStore.setState({
    viewerState: next.snapshot,
    viewerRedoStack: st.viewerRedoStack.slice(0, -1),
    viewerUndoStack: [...st.viewerUndoStack, { snapshot: st.viewerState, txnId: next.txnId }],
  });
  if (next.txnId !== undefined) {
    const st2 = useStore.getState();
    const top = st2.redoStack[st2.redoStack.length - 1];
    if (top && top.txnId === next.txnId) {
      useStore.setState({
        spec: top.snapshot,
        redoStack: st2.redoStack.slice(0, -1),
        undoStack: [...st2.undoStack, { snapshot: st2.spec, txnId: top.txnId }],
      });
    }
  }
  return next.snapshot;
}

export function clearSpecHistory() {
  useStore.setState({ undoStack: [], redoStack: [] });
}
export function clearViewerHistory() {
  useStore.setState({ viewerUndoStack: [], viewerRedoStack: [] });
}
export function canUndoSpec(): boolean { return useStore.getState().undoStack.length > 0; }
export function canRedoSpec(): boolean { return useStore.getState().redoStack.length > 0; }
export function canUndoViewer(): boolean { return useStore.getState().viewerUndoStack.length > 0; }
export function canRedoViewer(): boolean { return useStore.getState().viewerRedoStack.length > 0; }
