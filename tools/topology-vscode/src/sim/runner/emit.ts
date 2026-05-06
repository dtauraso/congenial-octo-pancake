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
      notify({
        type: "emit",
        edgeId: inEdge.id,
        fromNodeId: inEdge.source,
        toNodeId: inEdge.target,
        value: rec.inputValue,
        tick: rec.tick,
        pulseId: nextPulseId(),
      });
      if (cadence.isInputToReadGateChain(state.spec, inEdge.id)) {
        cadence.markEmitted(inEdge.source, rec.inputValue);
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
  let firingNodeIsReadGate = false;
  for (const em of rec.emissions) {
    for (const edge of state.spec.edges) {
      if (edge.source === rec.nodeId && edge.sourceHandle === em.port) {
        const fromNode = state.spec.nodes.find((n) => n.id === rec.nodeId);
        if (fromNode?.type === "ReadGate") firingNodeIsReadGate = true;
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
  if (firingNodeIsReadGate) {
    cadence.ackFromReadGate(state.spec, rec.nodeId, (p) => {
      if (!state.spec || !state.world) return;
      cadence.markEmitted(p.sourceNodeId, p.value);
      enqueueEmission(state.spec, state.world, p.sourceNodeId, p.sourceHandle, p.value, state.world.tick + 1);
      notify({
        type: "emit",
        edgeId: p.edgeId,
        fromNodeId: p.sourceNodeId,
        toNodeId: p.toNodeId,
        value: p.value,
        tick: state.world.tick,
        pulseId: nextPulseId(),
      });
    });
  }
  // N1' concurrency-reveal self-pacer: pulse N just arrived at target
  // via rec.inEdgeId. If that edge is concurrent, fire pulse N+1 from
  // its source on the same port with the same value, scheduled one
  // edge-delay ahead. This produces the continuous re-firing loop that
  // makes parallel regions of the topology visible.
  if (rec.inEdgeId && state.concurrentEdges.has(rec.inEdgeId)) {
    const edge = findEdge(state.spec, rec.inEdgeId);
    if (edge) {
      const gated = cadence.isInputToReadGateChain(state.spec, edge.id);
      if (gated && !cadence.mayEmit(edge.source)) {
        cadence.recordPending({
          sourceNodeId: edge.source,
          sourceHandle: edge.sourceHandle,
          edgeId: edge.id,
          toNodeId: edge.target,
          value: rec.inputValue,
        });
      } else {
        if (gated) cadence.markEmitted(edge.source, rec.inputValue);
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
