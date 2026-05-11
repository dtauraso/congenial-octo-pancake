// Atomic types + handler formalism. Graph types (Node/Edge/Spec) live
// in types-graph.ts; the runtime registry and parsers live alongside.

export type EdgeKind =
  | "chain"
  | "signal"
  | "feedback-ack"
  | "release"
  | "streak"
  | "pointer"
  | "and-out"
  | "edge-connection"
  | "inhibit-in"
  | "any";

export const EDGE_KINDS: readonly EdgeKind[] = [
  "chain", "signal", "feedback-ack", "release", "streak",
  "pointer", "and-out", "edge-connection", "inhibit-in", "any",
];

export type Port = { name: string; kind: EdgeKind; required?: boolean };
export type StateValue = string | number;
export type ArrowStyle = "filled" | "open";
