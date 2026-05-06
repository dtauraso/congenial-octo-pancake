// Sim-adjacent presentation-cadence: the in0/readGate emission ack.
//
// Back-channel internal to the visualization, not part of runtime
// topology and not part of simulator event state. When an Input node
// feeds a ReadGate via chainIn, the Input is permitted to emit its
// next pulse only after the ReadGate has *begun emitting* its visible
// output pulse. The first emission is free (no prior ack required);
// every subsequent emission gates on the ack.

import type { Spec, StateValue } from "../schema";

export type PendingRefire = {
  sourceNodeId: string;
  sourceHandle: string;
  edgeId: string;
  toNodeId: string;
  value: StateValue;
};

const awaitingAck = new Set<string>();
const pendingRefire = new Map<string, PendingRefire>();

export function mayEmit(inputNodeId: string): boolean {
  return !awaitingAck.has(inputNodeId);
}

export function markEmitted(inputNodeId: string): void {
  awaitingAck.add(inputNodeId);
}

export function recordPending(p: PendingRefire): void {
  pendingRefire.set(p.sourceNodeId, p);
}

// Called when a ReadGate begins emitting outward. Clears the ack-wait
// for any Input feeding its chainIn; if a refire was parked while
// gated, hand it back so the caller can fire it now.
export function ackFromReadGate(
  spec: Spec,
  readGateNodeId: string,
  fire: (p: PendingRefire) => void,
): void {
  for (const edge of spec.edges) {
    if (edge.target !== readGateNodeId) continue;
    if (edge.targetHandle !== "chainIn") continue;
    const src = spec.nodes.find((n) => n.id === edge.source);
    if (src?.type !== "Input") continue;
    if (!awaitingAck.has(src.id)) continue;
    awaitingAck.delete(src.id);
    const p = pendingRefire.get(src.id);
    if (p) {
      pendingRefire.delete(src.id);
      fire(p);
    }
  }
}

export function isInputToReadGateChain(spec: Spec, edgeId: string): boolean {
  const edge = spec.edges.find((e) => e.id === edgeId);
  if (!edge) return false;
  if (edge.targetHandle !== "chainIn") return false;
  const src = spec.nodes.find((n) => n.id === edge.source);
  const tgt = spec.nodes.find((n) => n.id === edge.target);
  return src?.type === "Input" && tgt?.type === "ReadGate";
}

export function resetCadence(): void {
  awaitingAck.clear();
  pendingRefire.clear();
}
