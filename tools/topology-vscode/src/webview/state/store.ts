// Plain module-level state — replaces Zustand store now that all React
// consumers have been migrated to contexts (dimmed, runStatus) or RF
// (nodes, edges). spec and viewerState are live-binding module exports
// that non-React callers (save.ts, inline-edit.ts, etc.) read directly.

import type { Node, Spec } from "../../schema";
import type { RunStatus } from "../../messages";
import { DEFAULT_VIEWER_STATE, type ViewerState } from "./viewer/types";

// Webview-local: idle is the pre-first-run default. The wire RunStatus has
// no idle variant (the host only emits running/ok/error/cancelled).
export type RunStatusUI = RunStatus | { state: "idle" };

export let spec: Spec = { nodes: [], edges: [] };
export let viewerState: ViewerState = { ...DEFAULT_VIEWER_STATE };
export const nodeById = new Map<string, Node>();

export function _setSpec(next: Spec) {
  spec = next;
  nodeById.clear();
  for (const n of next.nodes) nodeById.set(n.id, n);
}

export function _setViewerState(next: ViewerState) {
  viewerState = next;
}
