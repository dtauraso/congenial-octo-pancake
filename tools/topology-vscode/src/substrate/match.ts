import type { Spec } from "../schema";

// Substrate-supported topology shapes. Anything else falls through to
// the legacy sim/runner. Keep these strict — silent broadening would
// let real topologies route through a substrate that does not yet
// satisfy R1–R5, masking bugs.

// Shape A: a single Input node feeding a single ReadGate via one chain
// edge. The original step-1 fixture.
function matchInputReadGate(spec: Spec): boolean {
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

// Shape B: Input -> ReadGate.chainIn AND ChainInhibitor -> ReadGate.ack.
// First multi-input port; ReadGate joins the two inbound wires via
// joinLoop. ChainInhibitor here has no inbound — it cycles a unit
// signal as a clock-style emitter.
function matchInputReadGateInhibitor(spec: Spec): boolean {
  if (spec.nodes.length !== 3) return false;
  if (spec.edges.length !== 2) return false;
  const input = spec.nodes.find((n) => n.type === "Input");
  const readGate = spec.nodes.find((n) => n.type === "ReadGate");
  const inhibitor = spec.nodes.find((n) => n.type === "ChainInhibitor");
  if (!input || !readGate || !inhibitor) return false;
  const chainEdge = spec.edges.find(
    (e) => e.source === input.id && e.target === readGate.id
      && e.kind === "chain" && e.targetHandle === "chainIn",
  );
  const ackEdge = spec.edges.find(
    (e) => e.source === inhibitor.id && e.target === readGate.id
      && e.kind === "chain" && e.targetHandle === "ack",
  );
  if (!chainEdge || !ackEdge) return false;
  return true;
}

export function matchSubstrate(spec: Spec): boolean {
  return matchInputReadGate(spec) || matchInputReadGateInhibitor(spec);
}
