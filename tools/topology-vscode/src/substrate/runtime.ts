// Port-plan step 1 substrate runtime. Drives the chan->wire visible
// primitive for the matched 2-node topology by emitting EmitEvents on
// the existing event-bus, so AnimatedEdge renders unchanged.
//
// Channel model: cap=0 (unbuffered). A token enters the wire only when
// the receiver has finished consuming the previous token. We model
// "finished consuming" as the AnimatedEdge having signalled completion,
// but step 1 does not yet wire that ack back through the bus — instead
// we space emissions by EMIT_INTERVAL_MS, which is conservative-enough
// to avoid overlap given AnimatedEdge's traversal animation. Step 3's
// R1 (FIFO) and R5 (animation step = state transition) tests will
// replace this spacing with a real ack-driven release.

import type { Spec, StateValue } from "../schema";
import { readNodeInit } from "../sim/seeds";
import { nextPulseId, notify, notifyState } from "../sim/event-bus";

const EMIT_INTERVAL_MS = 1500;

type SubstrateState = {
  intervalId: ReturnType<typeof setInterval> | null;
  spec: Spec | null;
  queue: StateValue[];
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  tick: number;
};

const state: SubstrateState = {
  intervalId: null,
  spec: null,
  queue: [],
  edgeId: "",
  fromNodeId: "",
  toNodeId: "",
  tick: 0,
};

export function loadSubstrate(spec: Spec): void {
  stopSubstrate();
  const input = spec.nodes.find((n) => n.type === "Input")!;
  const edge = spec.edges[0];
  state.spec = spec;
  state.queue = readNodeInit(input.data);
  state.edgeId = edge.id;
  state.fromNodeId = edge.source;
  state.toNodeId = edge.target;
  state.tick = 0;
  // Step 1 debug probe: confirms the substrate path was taken and shows
  // the queue we built. Remove once step 1 is verified end-to-end.
  console.log("[substrate] loaded", { edgeId: edge.id, queue: state.queue });
  notifyState();
  state.intervalId = setInterval(emitNext, EMIT_INTERVAL_MS);
}

export function stopSubstrate(): void {
  if (state.intervalId !== null) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
  state.spec = null;
  notifyState();
}

function emitNext(): void {
  if (state.queue.length === 0) {
    if (state.spec) {
      const input = state.spec.nodes.find((n) => n.type === "Input");
      if (input) state.queue = readNodeInit(input.data);
    }
    if (state.queue.length === 0) return;
  }
  const value = state.queue.shift()!;
  state.tick += 1;
  const ev = {
    type: "emit" as const,
    edgeId: state.edgeId,
    fromNodeId: state.fromNodeId,
    toNodeId: state.toNodeId,
    value,
    tick: state.tick,
    pulseId: nextPulseId(),
  };
  console.log("[substrate] emit", ev);
  notify(ev);
}
