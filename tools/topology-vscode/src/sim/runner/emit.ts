// Translate a simulator FireRecord into wire-bus events for the view,
// and run the N1' concurrency-reveal self-pacer that keeps parallel
// regions visibly cycling.

import { enqueueEmission, type FireRecord } from "../simulator";
import { notify, type FireEvent } from "../event-bus";
import { state, findEdge } from "./_state";

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
      });
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
        });
      }
    }
  }
  // N1' concurrency-reveal self-pacer: pulse N just arrived at target
  // via rec.inEdgeId. If that edge is concurrent, fire pulse N+1 from
  // its source on the same port with the same value, scheduled one
  // edge-delay ahead. This produces the continuous re-firing loop that
  // makes parallel regions of the topology visible.
  if (rec.inEdgeId && state.concurrentEdges.has(rec.inEdgeId)) {
    const edge = findEdge(state.spec, rec.inEdgeId);
    if (edge) {
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
      });
    }
  }
}
