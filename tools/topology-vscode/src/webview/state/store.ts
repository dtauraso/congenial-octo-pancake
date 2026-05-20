import { create } from "zustand";
import type { Node, Spec } from "../../schema";
import type { RunStatus } from "../../messages";
import { DEFAULT_VIEWER_STATE, type ViewerState } from "./viewer/types";

// Webview-local: idle is the pre-first-run default. The wire RunStatus has
// no idle variant (the host only emits running/ok/error/cancelled).
export type RunStatusUI = RunStatus | { state: "idle" };

export type View = { x: number; y: number; w: number; h: number };

interface Store {
  spec: Spec;
  viewerState: ViewerState;
  view: View;
  dimmed: Set<string> | null;
  runStatus: RunStatusUI;
}

export const useStore = create<Store>(() => ({
  spec: { nodes: [], edges: [] },
  viewerState: { ...DEFAULT_VIEWER_STATE },
  view: { x: 0, y: 0, w: 1380, h: 740 },
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
