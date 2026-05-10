// Per-shape loop setup for the wires runtime. One function per
// matchSubstrate shape; each builds the loops and registers the
// publish listeners (held / buffered) for that shape's wires.
// Tick publication is wired by the loop's onTick callback.

import type { Spec, StateValue } from "../schema";
import { readNodeInit } from "../sim/seeds";
import type { WireMap } from "./build-wires";
import {
  inputLoop, readGateLoop, joinLoop, andGateLoop, type NodeLoop,
} from "./node-loop";
import {
  publishHeld, publishTick,
  markBuffered, clearBuffered,
} from "./node-streams";
import type { TriggerGate } from "./trigger-gate";

export interface ManualAckEdge { id: string; label: string }
export interface TriggerSlot { id: string; label: string; gate: TriggerGate }
export interface ShapeSetup {
  loops: NodeLoop[];
  // Each entry: the wires runtime suppresses the visual layer's
  // arc-completion auto-ack on that edge; one editor button per entry
  // drives the ack instead. "B says room → A sends" model, applied
  // per-link.
  manualAckEdges?: ManualAckEdge[];
  // Edges whose ack is owned by a node-loop's consume-on-read (e.g.
  // andGateLoopWithCycleInputs marks a feedback inbound). The visual
  // layer must NOT auto-ack these on arc completion — the substrate
  // already did. Without this, the next-cycle's value gets dropped
  // by the late arc-completion ack racing the consumer's re-entry.
  selfAckEdges?: string[];
  // Whole-shape opt-out: every edge in this shape is self-acked by its
  // node-loop. Used by shapes built on nodeLoop (uniform self-acker), so
  // they don't have to enumerate edge ids. Logically equivalent to
  // listing every wire in selfAckEdges.
  selfAcksAll?: boolean;
  // Per-loop toggle gates. While closed, the loop parks before sending;
  // a panel button toggles open/closed. Used to pace a misbehaving
  // upstream by hand without fixing the underlying ack model.
  triggerSlots?: TriggerSlot[];
}

export function setupInputReadGate(
  spec: Spec,
  wires: WireMap,
  awaitGate: () => Promise<void>,
): ShapeSetup {
  const input = spec.nodes.find((n) => n.type === "Input")!;
  const readGate = spec.nodes.find((n) => n.type === "ReadGate")!;
  const edge = spec.edges.find((e) => e.source === input.id && e.target === readGate.id)!;
  const wire = wires.get(edge.id)!;
  wire.onArrive((v) => publishHeld(readGate.id, v as StateValue));
  const inPort = edge.targetHandle ?? "in";
  wire.onArrive(() => markBuffered(readGate.id, inPort));
  wire.onAck(() => clearBuffered(readGate.id, inPort));
  const queue = readNodeInit(input.data);
  return {
    loops: [
      readGateLoop(wire, { autoAck: false, onTick: () => publishTick(readGate.id) }),
      inputLoop(wire, queue, { awaitGate, onTick: () => publishTick(input.id) }),
    ],
    manualAckEdges: [{ id: edge.id, label: "in0→readGate" }],
  };
}

export function setupInputReadGateInhibitor(
  spec: Spec,
  wires: WireMap,
  awaitGate: () => Promise<void>,
): ShapeSetup {
  const input = spec.nodes.find((n) => n.type === "Input")!;
  const readGate = spec.nodes.find((n) => n.type === "ReadGate")!;
  const inhibitor = spec.nodes.find((n) => n.type === "ChainInhibitor")!;
  const chainEdge = spec.edges.find(
    (e) => e.source === input.id && e.target === readGate.id && e.targetHandle === "chainIn",
  )!;
  const ackEdge = spec.edges.find(
    (e) => e.source === inhibitor.id && e.target === readGate.id && e.targetHandle === "ack",
  )!;
  const inWire = wires.get(chainEdge.id)!;
  const ackWireE = wires.get(ackEdge.id)!;

  inWire.onArrive((v) => publishHeld(readGate.id, v as StateValue));
  inWire.onArrive(() => markBuffered(readGate.id, "chainIn"));
  inWire.onAck(() => clearBuffered(readGate.id, "chainIn"));
  ackWireE.onArrive(() => markBuffered(readGate.id, "ack"));
  ackWireE.onAck(() => clearBuffered(readGate.id, "ack"));

  const inputQueue = readNodeInit(input.data);
  // ChainInhibitor with no inbound: cycle a unit signal so the join
  // gets paced by both senders. When ChainInhibitor gains a real
  // inbound port, replace this with andGateLoop on its own inputs.
  const inhibitorQueue: StateValue[] = [1 as unknown as StateValue];
  return {
    loops: [
      joinLoop([inWire, ackWireE], { onFire: () => publishTick(readGate.id) }),
      inputLoop(inWire, inputQueue, { awaitGate, onTick: () => publishTick(input.id) }),
      inputLoop(ackWireE, inhibitorQueue, { awaitGate, onTick: () => publishTick(inhibitor.id) }),
    ],
    manualAckEdges: [
      { id: chainEdge.id, label: "in0→readGate" },
      { id: ackEdge.id, label: "i1→readGate" },
    ],
  };
}

// Shape C: Shape B + a second ChainInhibitor (i0) downstream of
// readGate. ReadGate now emits, so its loop becomes andGateLoop
// (chainIn + ack -> readGate.out). i0 is a sink for now — it consumes
// via readGateLoop and the visual layer paces ack.
export function setupInputReadGateInhibitorWithI0(
  spec: Spec,
  wires: WireMap,
  awaitGate: () => Promise<void>,
): ShapeSetup {
  const input = spec.nodes.find((n) => n.type === "Input")!;
  const readGate = spec.nodes.find((n) => n.type === "ReadGate")!;
  const inhibitors = spec.nodes.filter((n) => n.type === "ChainInhibitor");
  const chainEdge = spec.edges.find(
    (e) => e.source === input.id && e.target === readGate.id && e.targetHandle === "chainIn",
  )!;
  const ackEdge = spec.edges.find(
    (e) => e.target === readGate.id && e.targetHandle === "ack",
  )!;
  const outEdge = spec.edges.find(
    (e) => e.source === readGate.id && e.sourceHandle === "out" && e.targetHandle === "in",
  )!;
  const i1 = inhibitors.find((n) => n.id === ackEdge.source)!;
  const i0 = inhibitors.find((n) => n.id === outEdge.target)!;

  const inWire = wires.get(chainEdge.id)!;
  const ackWireE = wires.get(ackEdge.id)!;
  const outWire = wires.get(outEdge.id)!;

  inWire.onArrive((v) => publishHeld(readGate.id, v as StateValue));
  inWire.onArrive(() => markBuffered(readGate.id, "chainIn"));
  inWire.onAck(() => clearBuffered(readGate.id, "chainIn"));
  ackWireE.onArrive(() => markBuffered(readGate.id, "ack"));
  ackWireE.onAck(() => clearBuffered(readGate.id, "ack"));
  outWire.onArrive((v) => publishHeld(i0.id, v as StateValue));
  outWire.onArrive(() => markBuffered(i0.id, "in"));
  outWire.onAck(() => clearBuffered(i0.id, "in"));

  const inputQueue = readNodeInit(input.data);
  const i1Queue: StateValue[] = [1 as unknown as StateValue];
  return {
    loops: [
      readGateLoop(outWire, { autoAck: false, onTick: () => publishTick(i0.id) }),
      andGateLoop(
        [inWire, ackWireE],
        outWire,
        ([chainInVal]) => chainInVal,
        { onTick: () => publishTick(readGate.id) },
      ),
      inputLoop(inWire, inputQueue, { awaitGate, onTick: () => publishTick(input.id) }),
      inputLoop(ackWireE, i1Queue, { awaitGate, onTick: () => publishTick(i1.id) }),
    ],
    manualAckEdges: [
      { id: chainEdge.id, label: "in0→readGate" },
      { id: ackEdge.id, label: "i1→readGate" },
    ],
  };
}
