import { produce } from "immer";
import type { Spec } from "../../../schema";
import type { ViewerState } from "../viewer/types";
import { useStore, type RunStatusUI, type View } from "../store";

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
export function setDimmed(next: Set<string> | null) {
  useStore.setState({ dimmed: next });
}
export function setRunStatus(next: RunStatusUI) {
  useStore.setState({ runStatus: next });
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
  useStore.setState({ spec: next });
  return next;
}

export function mutateViewer<T>(fn: (v: ViewerState) => T): T {
  const prev = useStore.getState().viewerState;
  let result!: T;
  const next = produce(prev, (draft) => {
    result = fn(draft) as T;
  });
  if (next === prev) return result;
  useStore.setState({ viewerState: next });
  return result;
}
