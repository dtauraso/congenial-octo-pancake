import { produce } from "immer";
import type { Spec } from "../../../schema";
import type { ViewerState } from "../viewer/types";
import { _setSpec, _setViewerState, spec, viewerState } from "../store";

// ---- Setters ----
export function setSpec(next: Spec) {
  _setSpec(next);
}
export function setViewerState(next: ViewerState) {
  _setViewerState(next);
}
// History-bypassing patch for incidental viewer fields (camera, selection,
// fold position). Distinct from mutateViewer which pushes onto undo.
export function patchViewerState(fn: (v: ViewerState) => void) {
  _setViewerState(produce(viewerState, fn));
}

// ---- Mutators ----
export function mutateSpec(fn: (s: Spec) => void): Spec {
  const next = produce(spec, fn);
  _setSpec(next);
  return next;
}

export function mutateViewer<T>(fn: (v: ViewerState) => T): T {
  let result!: T;
  const next = produce(viewerState, (draft) => {
    result = fn(draft) as T;
  });
  if (next !== viewerState) _setViewerState(next);
  return result;
}
