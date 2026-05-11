import type { Spec } from "../../schema";
import type { ViewerState } from "../viewerState";
import { useStore, type RunStatusUI, type Scope } from "./store";

// ---- Plain getters (non-React) ----
export const getSpec = (): Spec => useStore.getState().spec;
export const getViewerState = (): ViewerState => useStore.getState().viewerState;
export const getLastScope = (): Scope => useStore.getState().lastScope;

// ---- React selector hooks ----
export const useViewerState = (): ViewerState => useStore((s) => s.viewerState);
export const useDimmed = (): Set<string> | null => useStore((s) => s.dimmed);
export const useRunStatus = (): RunStatusUI => useStore((s) => s.runStatus);

export function canUndoSpec(): boolean { return useStore.getState().undoStack.length > 0; }
export function canRedoSpec(): boolean { return useStore.getState().redoStack.length > 0; }
export function canUndoViewer(): boolean { return useStore.getState().viewerUndoStack.length > 0; }
export function canRedoViewer(): boolean { return useStore.getState().viewerRedoStack.length > 0; }
