import type { Spec } from "../schema";

// Step 1 of the substrate rebuild supports exactly one topology shape:
// a single Input node feeding a single ReadGate via one chain edge.
// Anything else falls through to the legacy sim/runner.
//
// Widening this predicate is a deliberate later step (port-plan step 4
// onwards). Keep it strict — silent broadening would let real
// topologies route through a substrate that does not yet satisfy
// R1–R5, masking bugs.
export function matchSubstrate(spec: Spec): boolean {
  if (spec.nodes.length !== 2) return false;
  if (spec.edges.length !== 1) return false;
  const input = spec.nodes.find((n) => n.type === "Input");
  const readGate = spec.nodes.find((n) => n.type === "ReadGate");
  if (!input || !readGate) return false;
  const edge = spec.edges[0];
  if (edge.kind !== "chain") return false;
  if (edge.source !== input.id) return false;
  if (edge.target !== readGate.id) return false;
  return true;
}
