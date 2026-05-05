import { useShallow } from "zustand/react/shallow";
import type { Spec } from "../../schema";
import type { ViewerState } from "../viewerState";
import { useStore, type RunStatusUI, type Scope, type TraceState, type View } from "./store";

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

export const useDimmed = (): Set<string> | null => useStore((s) => s.dimmed);
export const useRunStatus = (): RunStatusUI => useStore((s) => s.runStatus);
export const useTrace = (): TraceState => useStore(useShallow((s) => s.trace));

export function canUndoSpec(): boolean { return useStore.getState().undoStack.length > 0; }
export function canRedoSpec(): boolean { return useStore.getState().redoStack.length > 0; }
export function canUndoViewer(): boolean { return useStore.getState().viewerUndoStack.length > 0; }
export function canRedoViewer(): boolean { return useStore.getState().viewerRedoStack.length > 0; }
