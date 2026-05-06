// Translate a simulator FireRecord into wire-bus events for the view,
// and run the N1' concurrency-reveal self-pacer that keeps parallel
// regions visibly cycling.

import { enqueueEmission, type FireRecord } from "../simulator";
import { notify, nextPulseId, type FireEvent } from "../event-bus";
import { state, findEdge } from "./_state";
import * as cadence from "../../cadence/in0ReadGateAck";

export function emitEvents(rec: FireRecord): void {
  if (!state.spec || !state.world) return;
  // Seed-driven arrivals (Input-sourced edges) have no upstream handler
  // to produce an emit notification, so the pulse animation never
  // starts. Notify a paired emit here so seed values are visible — same
  // role the N1' self-pacer used to play incidentally before Input was
  // excluded from concurrent classification.
  if (rec.inEdgeId) {
    const inEdge = findEdge(state.spec, rec.inEdgeId);
    const srcNode = inEdge ? state.spec.nodes.find((n) => n.id === inEdge.source) : undefined;
    if (inEdge && srcNode?.type === "Input") {
      const isCadenced = cadence.isCadenced(inEdge.source);
      // Cadence suppresses sim notifies for any source declared
      // gated via a `cadence-ack` edge in the spec. While awaiting
      // both anim-end conditions (data-leg arrival + dst output),
      // sim notifies on this edge are dropped — the "Go channel
      // would have blocked the sender" semantic projected onto the
      // canvas. Filter-only: never synthesizes pulses.
      if (!isCadenced || cadence.mayEmit(inEdge.source)) {
        notify({
          type: "emit",
          edgeId: inEdge.id,
          fromNodeId: inEdge.source,
          toNodeId: inEdge.target,
          value: rec.inputValue,
          tick: rec.tick,
          pulseId: nextPulseId(),
        });
        if (isCadenced) {
          cadence.markEmitted(inEdge.source, rec.inputValue);
        }
      }
    }
  }
  const fireEvent: FireEvent = {
    type: "fire",
    nodeId: rec.nodeId,
    inputPort: rec.inputPort,
    inputValue: rec.inputValue,
    tick: rec.tick,
    ord: rec.ord,
  };
  notify(fireEvent);
  for (const em of rec.emissions) {
    for (const edge of state.spec.edges) {
      if (edge.source === rec.nodeId && edge.sourceHandle === em.port) {
        notify({
          type: "emit",
          edgeId: edge.id,
          fromNodeId: rec.nodeId,
          toNodeId: edge.target,
          value: em.value,
          tick: rec.tick,
          pulseId: nextPulseId(),
        });
      }
    }
  }
  // ReadGate's outbound emissions are notified above, but the cadence
  // ack does not fire here — it fires when the renderer mounts the
  // PulseInstance for that emission. See signalReadGateRenderStart.
  // Sim-side ack would fire as fast as ticks (~400ms) regardless of
  // visible pulse traversal time (~5–7s), so in0 would re-emit before
  // the previous pulse cleared the edge. Renderer-side ack paces in0
  // to actual visible motion.
  // (renderer-driven cadence ack inserted by signalReadGateRenderStart;
  // see the cadence section above.)
  // N1' concurrency-reveal self-pacer: pulse N just arrived at target
  // via rec.inEdgeId. If that edge is concurrent, fire pulse N+1 from
  // its source on the same port with the same value, scheduled one
  // edge-delay ahead. This produces the continuous re-firing loop that
  // makes parallel regions of the topology visible.
  if (rec.inEdgeId && state.concurrentEdges.has(rec.inEdgeId)) {
    const edge = findEdge(state.spec, rec.inEdgeId);
    if (edge) {
      {
        enqueueEmission(
          state.spec,
          state.world,
          edge.source,
          edge.sourceHandle,
          rec.inputValue,
          state.world.tick + 1,
        );
        notify({
          type: "emit",
          edgeId: edge.id,
          fromNodeId: edge.source,
          toNodeId: edge.target,
          value: rec.inputValue,
          tick: state.world.tick,
          pulseId: nextPulseId(),
        });
      }
    }
  }
}

// Renderer-driven cadence signal. Called from PulseInstance on
// anim-end (localT >= 1). Dispatches to the generic cadence latch,
// which matches the edge id (data leg) and the fromNodeId (dst leg)
// against entries built from `cadence-ack` edges in the spec. No
// node-type knowledge here — the rule is in the spec.
//
// Folded/headless edges that never render-complete stall the cadence
// (acceptable tradeoff — visual pacing requires a visual signal).
export function signalPulseComplete(edgeId: string, fromNodeId: string): void {
  cadence.signalPulseComplete(edgeId, fromNodeId);
}
