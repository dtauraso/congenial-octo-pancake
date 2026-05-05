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

export type Port = { name: string; kind: EdgeKind };
export type StateValue = string | number;
export type EdgeRoute = "line" | "snake" | "below";
export type ArrowStyle = "filled" | "open";

// Simulator handler formalism (Phase 5.5). A handler is a pure function
// (state, input, props) → (state', emissions). Registered per node-type
// per input-port in src/sim/handlers.ts.
export type Emission = {
  port: string;
  value: StateValue;
  // Ticks until visible at the destination. Defaults to 1 if omitted.
  delay?: number;
};

export type HandlerState = Record<string, StateValue>;
export type HandlerInput = { port: string; value: StateValue };
export type HandlerResult = { state: HandlerState; emissions: Emission[] };
export type HandlerFn = (
  state: HandlerState,
  input: HandlerInput,
  props: Record<string, StateValue>,
) => HandlerResult;
