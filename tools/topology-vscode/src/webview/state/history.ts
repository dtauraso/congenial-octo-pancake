import type { Spec } from "../../schema";
import type { ViewerState } from "../viewerState";
import { useStore } from "./store";

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
