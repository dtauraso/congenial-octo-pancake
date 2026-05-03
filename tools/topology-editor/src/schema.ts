// Node-type registry. Single source of truth for ports and visual styling.
// `kind` values must match SVG edge classes from docs/svg-style-guide.md §5.

export type EdgeKind =
  | "chain"          // pipeline data advance
  | "signal"         // ready/done pulse
  | "feedback-ack"   // backpressure cycle closer
  | "release"        // latch release
  | "streak"         // sd → sd same-sign chain
  | "pointer"        // struct ref, not dataflow
  | "and-out"        // AND-gate reduction out
  | "edge-connection" // read-port sample (old/new)
  | "inhibit-in"     // input to an inhibit-right-gate
  | "any";           // generic / wildcard — sketch mode only

export type Port = { name: string; kind: EdgeKind };

export type NodeTypeDef = {
  role: string;
  inputs: Port[];
  outputs: Port[];
  shape: "rect" | "pill";
  fill: string;
  stroke: string;
  width: number;
  height: number;
};

export const NODE_TYPES: Record<string, NodeTypeDef> = {
  Generic: {
    role: "generic",
    inputs: [],
    outputs: [],
    shape: "rect", fill: "#ffffff", stroke: "#888", width: 110, height: 60,
  },
  Input: {
    role: "input",
    inputs: [],
    outputs: [
      { name: "out", kind: "chain" },
      { name: "ready", kind: "signal" },
    ],
    shape: "rect", fill: "#e0e0e0", stroke: "#666", width: 80, height: 60,
  },
  ReadLatch: {
    role: "latch",
    inputs: [{ name: "in", kind: "chain" }, { name: "release", kind: "release" }],
    outputs: [{ name: "out", kind: "chain" }, { name: "ack", kind: "feedback-ack" }],
    shape: "rect", fill: "#e0f7fa", stroke: "#00838f", width: 90, height: 50,
  },
  ChainInhibitor: {
    role: "inhibitor",
    inputs: [{ name: "in", kind: "chain" }],
    outputs: [
      { name: "out", kind: "chain" },
      { name: "readOld", kind: "edge-connection" },
      { name: "readNew", kind: "edge-connection" },
      { name: "inhibitOut", kind: "inhibit-in" },
    ],
    shape: "rect", fill: "#fff3e0", stroke: "#e65100", width: 90, height: 60,
  },
  InhibitRightGate: {
    role: "inhibit-right-gate",
    inputs: [
      { name: "left", kind: "inhibit-in" },
      { name: "right", kind: "inhibit-in" },
    ],
    outputs: [{ name: "out", kind: "and-out" }],
    shape: "rect", fill: "#fce4ec", stroke: "#880e4f", width: 110, height: 36,
  },
  DetectorLatch: {
    role: "latch",
    inputs: [{ name: "in", kind: "chain" }, { name: "release", kind: "release" }],
    outputs: [{ name: "out", kind: "chain" }, { name: "ack", kind: "feedback-ack" }],
    shape: "rect", fill: "#e0f7fa", stroke: "#00838f", width: 90, height: 50,
  },
  StreakBreakDetector: {
    role: "sbd",
    inputs: [
      { name: "old", kind: "edge-connection" },
      { name: "new", kind: "edge-connection" },
    ],
    outputs: [{ name: "done", kind: "signal" }],
    shape: "pill", fill: "#ffebee", stroke: "#c62828", width: 110, height: 40,
  },
  StreakDetector: {
    role: "sd",
    inputs: [
      { name: "old", kind: "edge-connection" },
      { name: "new", kind: "edge-connection" },
    ],
    outputs: [{ name: "done", kind: "signal" }, { name: "streak", kind: "streak" }],
    shape: "pill", fill: "#e8f5e9", stroke: "#2e7d32", width: 100, height: 40,
  },
  AndGate: {
    role: "and-gate",
    inputs: [{ name: "a", kind: "signal" }, { name: "b", kind: "signal" }],
    outputs: [{ name: "out", kind: "and-out" }],
    shape: "rect", fill: "#f3e5f5", stroke: "#7b1fa2", width: 70, height: 40,
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
  Partition: {
    role: "partition",
    inputs: [{ name: "in", kind: "chain" }],
    outputs: [{ name: "out", kind: "chain" }],
    shape: "rect", fill: "#fce4ec", stroke: "#ad1457", width: 90, height: 50,
  },
};

export const KIND_COLORS: Record<EdgeKind, string> = {
  "chain": "#333",
  "signal": "#7b1fa2",
  "feedback-ack": "#7b1fa2",
  "release": "#00838f",
  "streak": "#2e7d32",
  "pointer": "#e65100",
  "and-out": "#283593",
  "edge-connection": "#2266aa",
  "inhibit-in": "#880e4f",
  "any": "#888",
};
