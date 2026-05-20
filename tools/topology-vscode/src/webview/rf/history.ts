// RF-snapshot-based undo/redo. Replaces the 4 paired Zustand stacks
// (undoSpec/redoSpec/undoViewer/redoViewer) with a single history backed
// by RF's toObject() snapshot.
//
// Usage:
//   registerHistory(rf)  — call once in Inner() on mount
//   pushSnapshot()       — call after any mutation that changes nodes/edges
//   undo() / redo()      — restore previous/next RF state

import type { ReactFlowInstance, Node as RFNode, Edge as RFEdge } from "reactflow";

const HISTORY_LIMIT = 50;

interface Snapshot {
  nodes: RFNode[];
  edges: RFEdge[];
}

let past: Snapshot[] = [];
let future: Snapshot[] = [];
let _rf: ReactFlowInstance | null = null;

export function registerHistory(rf: ReactFlowInstance) {
  _rf = rf;
}

export function pushSnapshot() {
  if (!_rf) return;
  const { nodes, edges } = _rf.toObject();
  past.push({ nodes, edges });
  if (past.length > HISTORY_LIMIT) past.shift();
  // Any new action clears the redo stack.
  future = [];
}

export function undo() {
  if (!_rf || past.length === 0) return;
  const current = { nodes: _rf.getNodes(), edges: _rf.getEdges() };
  const prev = past.pop()!;
  future.push(current);
  _rf.setNodes(prev.nodes);
  _rf.setEdges(prev.edges);
}

export function redo() {
  if (!_rf || future.length === 0) return;
  const current = { nodes: _rf.getNodes(), edges: _rf.getEdges() };
  const next = future.pop()!;
  past.push(current);
  _rf.setNodes(next.nodes);
  _rf.setEdges(next.edges);
}

export function canUndo() { return past.length > 0; }
export function canRedo() { return future.length > 0; }
