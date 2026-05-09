// Per-shape loop setup for the wires runtime. One function per
// matchSubstrate shape; each builds the loops and registers the
// publish listeners (held / buffered) for that shape's wires.
// Tick publication is wired by the loop's onTick callback.

import type { Spec, StateValue } from "../schema";
import { readNodeInit } from "../sim/seeds";
import type { WireMap } from "./build-wires";
import { inputLoop, readGateLoop, joinLoop, type NodeLoop } from "./node-loop";
import {
  publishHeld, publishTick,
  markBuffered, clearBuffered,
} from "./node-streams";

export interface ShapeSetup {
  loops: NodeLoop[];
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
  };
}
