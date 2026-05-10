// Shape A on the step substrate, plugged into the existing observation
// surface (Wire + node-streams) so the renderer needs no change.
//
// Per-tick rules:
//   Input.step():    if wire idle AND queue not exhausted, kick off
//                    wire.send(v). The send promise resolves when the
//                    visual layer auto-acks on arc completion (Shape A
//                    is selfAcksAll: true).
//   ReadGate.step(): no-op. Its tick is published via wire.onAck.

import type { Spec, StateValue } from "../../schema";
import { readNodeInit } from "../../sim/seeds";
import { buildWires, type WireMap } from "../build-wires";
import {
  publishHeld, publishTick, markBuffered, clearBuffered,
} from "../node-streams";
import type { StepNode } from "./node";

export interface StepShapeASetup {
  nodes: StepNode[];
  wires: WireMap;
  selfAcksAll: true;
}

export function setupStepShapeA(spec: Spec): StepShapeASetup {
  const wires = buildWires(spec);
  const input = spec.nodes.find((n) => n.type === "Input")!;
  const readGate = spec.nodes.find((n) => n.type === "ReadGate")!;
  const edge = spec.edges.find((e) => e.source === input.id && e.target === readGate.id)!;
  const wire = wires.get(edge.id)!;
  const inPort = edge.targetHandle ?? "in";

  wire.onArrive((v) => publishHeld(readGate.id, v as StateValue));
  wire.onArrive(() => markBuffered(readGate.id, inPort));
  wire.onAck(() => clearBuffered(readGate.id, inPort));
  wire.onAck(() => publishTick(readGate.id));

  const queue = readNodeInit(input.data);
  let i = 0;

  const inputNode: StepNode = {
    id: input.id,
    step() {
      if (!wire.ready) return;
      if (queue.length === 0) return;
      const v = queue[i++ % queue.length];
      publishTick(input.id);
      void wire.send(v);
    },
  };
  const readGateNode: StepNode = {
    id: readGate.id,
    step() { /* observation-only; tick published by wire.onAck */ },
  };
  return { nodes: [inputNode, readGateNode], wires, selfAcksAll: true };
}
