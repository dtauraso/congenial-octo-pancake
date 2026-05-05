// Node-type registry. Single source of truth for ports and visual
// styling per node type. `kind` values must match SVG edge classes
// from docs/svg-style-guide.md §5.

import type { NodeTypeDef } from "./types-graph";

export const NODE_TYPES: Record<string, NodeTypeDef> = {
  Generic: {
    role: "generic",
    inputs: [], outputs: [],
    shape: "rect", fill: "#ffffff", stroke: "#888", width: 110, height: 60,
  },
  Input: {
    role: "input",
    inputs: [],
    outputs: [{ name: "out", kind: "chain" }],
    shape: "rect", fill: "#e0e0e0", stroke: "#666", width: 80, height: 60,
  },
  ReadLatch: {
    role: "latch",
    inputs: [{ name: "in", kind: "chain" }, { name: "release", kind: "release" }],
    outputs: [{ name: "out", kind: "chain" }, { name: "ack", kind: "feedback-ack" }],
    shape: "rect", fill: "#e0f7fa", stroke: "#00838f", width: 90, height: 50,
    defaultProps: { delay: 1 },
  },
  ChainInhibitor: {
    role: "inhibitor",
    inputs: [{ name: "in", kind: "chain" }],
    outputs: [
      { name: "inhibitOut", kind: "inhibit-in" },
      { name: "readNew", kind: "edge-connection" },
      { name: "out", kind: "chain" },
      { name: "ack", kind: "feedback-ack" },
    ],
    shape: "rect", fill: "#fff3e0", stroke: "#e65100", width: 90, height: 60,
  },
  InhibitRightGate: {
    role: "inhibit-right-gate",
    inputs: [{ name: "left", kind: "inhibit-in" }, { name: "right", kind: "inhibit-in" }],
    outputs: [{ name: "out", kind: "and-out" }],
    shape: "rect", fill: "#fce4ec", stroke: "#880e4f", width: 110, height: 36,
  },
  DetectorLatch: {
    role: "latch",
    inputs: [{ name: "in", kind: "chain" }, { name: "release", kind: "release" }],
    outputs: [{ name: "out", kind: "chain" }, { name: "ack", kind: "feedback-ack" }],
    shape: "rect", fill: "#e0f7fa", stroke: "#00838f", width: 90, height: 50,
    defaultProps: { delay: 1 },
  },
  StreakBreakDetector: {
    role: "sbd",
    inputs: [{ name: "old", kind: "edge-connection" }, { name: "new", kind: "edge-connection" }],
    outputs: [{ name: "done", kind: "signal" }],
    shape: "pill", fill: "#ffebee", stroke: "#c62828", width: 110, height: 40,
  },
  StreakDetector: {
    role: "sd",
    inputs: [{ name: "old", kind: "edge-connection" }, { name: "new", kind: "edge-connection" }],
    outputs: [{ name: "done", kind: "signal" }, { name: "streak", kind: "streak" }],
    shape: "pill", fill: "#e8f5e9", stroke: "#2e7d32", width: 100, height: 40,
  },
  AndGate: {
    role: "and-gate",
    inputs: [{ name: "a", kind: "signal" }, { name: "b", kind: "signal" }],
    outputs: [{ name: "out", kind: "and-out" }],
    shape: "rect", fill: "#f3e5f5", stroke: "#7b1fa2", width: 70, height: 40,
    defaultProps: { inputCount: 2 },
  },
  PatternAnd: {
    role: "pattern-and",
    inputs: [{ name: "a", kind: "signal" }, { name: "b", kind: "signal" }],
    outputs: [{ name: "out", kind: "and-out" }],
    shape: "rect", fill: "#e8eaf6", stroke: "#283593", width: 70, height: 40,
  },
  SyncGate: {
    role: "sync-gate",
    inputs: [{ name: "a", kind: "signal" }, { name: "b", kind: "signal" }],
    outputs: [{ name: "release", kind: "release" }],
    shape: "rect", fill: "#f3e5f5", stroke: "#7b1fa2", width: 70, height: 40,
  },
  ReadGate: {
    role: "and-gate",
    inputs: [{ name: "chainIn", kind: "chain" }, { name: "ack", kind: "feedback-ack" }],
    outputs: [{ name: "out", kind: "chain" }],
    shape: "rect", fill: "#f3e5f5", stroke: "#7b1fa2", width: 70, height: 40,
  },
  EdgeNode: {
    role: "edge",
    inputs: [{ name: "left", kind: "inhibit-in" }, { name: "right", kind: "inhibit-in" }],
    outputs: [
      { name: "outInhibitor", kind: "signal" },
      { name: "outPartition", kind: "signal" },
      { name: "outNextEdge", kind: "signal" },
    ],
    shape: "rect", fill: "#fff8e1", stroke: "#ff6f00", width: 90, height: 50,
  },
  Partition: {
    role: "partition",
    inputs: [{ name: "in", kind: "chain" }],
    outputs: [{ name: "out", kind: "chain" }],
    shape: "rect", fill: "#fce4ec", stroke: "#ad1457", width: 90, height: 50,
    defaultProps: { slidePx: 30 },
  },
};
