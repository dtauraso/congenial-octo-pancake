// Sim-adjacent presentation-cadence: the in0/readGate emission ack.
//
// Back-channel internal to the visualization, not part of runtime
// topology and not part of simulator event state. When an Input node
// feeds a ReadGate via chainIn, the Input is permitted to emit its
// next pulse only after the ReadGate has *begun emitting* its visible
// output pulse. The first emission is free (the simulator seed); every
// subsequent emission is driven by the cadence ack itself, not by the
// N1' concurrency self-pacer (which deliberately excludes Input
// sources to preserve the deterministic seed sequence).
//
// On ack: if a refire was parked while gated, fire it. Otherwise
// synthesize a fresh emission from the last-emitted value so in0
// keeps cycling in lock-step with readGate's output rather than
// waiting for the cycle-restart timer.

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
const lastValue = new Map<string, StateValue>();

export function mayEmit(inputNodeId: string): boolean {
  return !awaitingAck.has(inputNodeId);
}

export function markEmitted(inputNodeId: string, value: StateValue): void {
  awaitingAck.add(inputNodeId);
  lastValue.set(inputNodeId, value);
}

export function recordPending(p: PendingRefire): void {
  pendingRefire.set(p.sourceNodeId, p);
}

// Called when a ReadGate begins emitting outward. For each Input
// feeding its chainIn that's currently awaiting ack: clear the wait
// and hand the caller a refire to fire — either the parked one (if a
// gated emission was suppressed) or a fresh one synthesized from the
// last emitted value (the cadence-driven repeat, replacing the role
// the self-pacer would play for non-Input edges).
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
    const parked = pendingRefire.get(src.id);
    if (parked) {
      pendingRefire.delete(src.id);
      fire(parked);
      continue;
    }
    const v = lastValue.get(src.id);
    if (v === undefined) continue;
    fire({
      sourceNodeId: src.id,
      sourceHandle: edge.sourceHandle,
      edgeId: edge.id,
      toNodeId: edge.target,
      value: v,
    });
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
  lastValue.clear();
}
