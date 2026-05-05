import { produce } from "immer";
import type { Spec } from "../../schema";
import type { ViewerState } from "../viewerState";
import { useStore, withCap, type RunStatusUI, type Scope, type TraceState, type View } from "./store";

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
export function setDimmed(next: Set<string> | null) {
  useStore.setState({ dimmed: next });
}
export function setRunStatus(next: RunStatusUI) {
  useStore.setState({ runStatus: next });
}
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
  // immer returns the same reference when no draft mutations occurred. Skip
  // the history push so validation paths that early-return (createFold
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
