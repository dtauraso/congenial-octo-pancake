// Sim-adjacent presentation-cadence: visual back-pressure derived
// from spec topology.
//
// Each entry in `spec.cadenceAcks` encodes a back-pressure rule:
//   source = data destination (the "ack producer")
//   target = gated source (the "ack consumer")
// Meaning: the gated source may emit its next visible pulse only
// after the data destination's most recent visible cycle has fully
// completed. Concretely, two anim-end conditions per latched cycle:
//   (a) the gated source's data pulse has visibly arrived at the
//       destination (data-edge anim-end), AND
//   (b) one of the destination's outbound visible pulses has ended
//       (destination has visibly produced output).
// Whichever is slower dictates the gate.
//
// Filter-only: the cadence never synthesizes visible pulses; it only
// suppresses sim-side notifies until both conditions are met. The
// next visible pulse is whichever sim-driven emission the cadence
// next allows through.
//
// Naming note: the file name is historical — the rule is now generic
// over any (destination, gated source) pair declared via a
// cadence-ack edge, not specific to in0/readGate. See contract C10
// (test/contracts/cadence-back-pressure.test.ts) for the formal rule.

import type { Spec, StateValue } from "../schema";

type Latch = { srcArrived: boolean; dstOutputDone: boolean };
type Entry = { dataEdgeId: string; dstId: string };

// Map gated-source node id → registry entry. Built from spec at load.
const registry = new Map<string, Entry>();
// Map gated-source node id → latch state (only present when awaiting).
const awaiting = new Map<string, Latch>();

export function buildRegistry(spec: Spec): void {
  registry.clear();
  awaiting.clear();
  for (const ack of spec.cadenceAcks ?? []) {
    const srcId = ack.target; // gated source
    const dstId = ack.source; // data destination
    // The data edge is the spec edge from src → dst.
    const dataEdge = spec.edges.find(
      (e) => e.source === srcId && e.target === dstId,
    );
    if (!dataEdge) continue;
    registry.set(srcId, { dataEdgeId: dataEdge.id, dstId });
  }
}

export function isCadenced(sourceNodeId: string): boolean {
  return registry.has(sourceNodeId);
}

export function mayEmit(sourceNodeId: string): boolean {
  return !awaiting.has(sourceNodeId);
}

export function markEmitted(sourceNodeId: string, _value: StateValue): void {
  if (!registry.has(sourceNodeId)) return;
  awaiting.set(sourceNodeId, { srcArrived: false, dstOutputDone: false });
}

function maybeClear(sourceNodeId: string): void {
  const s = awaiting.get(sourceNodeId);
  if (s && s.srcArrived && s.dstOutputDone) awaiting.delete(sourceNodeId);
}

// Called from PulseInstance on anim-end (true completion only). The
// edge id matches the data leg of any latched entry; the fromNodeId
// matches the destination leg. Both legs may fire from independent
// PulseInstance completions; whichever lands second clears the latch.
export function signalPulseComplete(edgeId: string, fromNodeId: string): void {
  for (const [srcId, entry] of registry) {
    const s = awaiting.get(srcId);
    if (!s) continue;
    if (entry.dataEdgeId === edgeId) {
      s.srcArrived = true;
      maybeClear(srcId);
    }
    if (entry.dstId === fromNodeId) {
      s.dstOutputDone = true;
      maybeClear(srcId);
    }
  }
}

export function resetCadence(): void {
  awaiting.clear();
}
