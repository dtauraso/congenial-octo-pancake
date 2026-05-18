// Atomic types + handler formalism. Graph types (Node/Edge/Spec) live
// in types-graph.ts; the runtime registry and parsers live alongside.

export type EdgeKind =
  | "chain"
  | "signal"
  | "release"
  | "streak"
  | "pointer"
  | "and-out"
  | "edge-connection"
  | "inhibit-in"
  | "any";

export const EDGE_KINDS: readonly EdgeKind[] = [
  "chain", "signal", "release", "streak",
  "pointer", "and-out", "edge-connection", "inhibit-in", "any",
];

export type Port = {
  name: string;
  kind: EdgeKind;
  required?: boolean;
  // Visual placement. Independent of input/output: inputs default to
  // "left" and outputs to "right", but any port may be placed on any
  // side. Layout-only — has no substrate-model effect.
  side?: "left" | "right" | "top" | "bottom";
  // Snap slot along the side: 0=25%, 1=50%, 2=75%. Absent = auto-space.
  slot?: 0 | 1 | 2;
};
export type StateValue = string | number;
export type ArrowStyle = "filled" | "open";
