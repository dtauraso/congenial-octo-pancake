import type { Spec } from "../../../schema";
import type { ViewerState } from "../viewer/types";
import { useStore, type RunStatusUI } from "../store";

// ---- Plain getters (non-React) ----
export const getSpec = (): Spec => useStore.getState().spec;
export const getViewerState = (): ViewerState => useStore.getState().viewerState;

// ---- React selector hooks ----
export const useViewerState = (): ViewerState => useStore((s) => s.viewerState);
export const useDimmed = (): Set<string> | null => useStore((s) => s.dimmed);
export const useRunStatus = (): RunStatusUI => useStore((s) => s.runStatus);
