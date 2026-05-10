// Shape A wiring on the ticked substrate. Input emits one queued
// value per tick onto the in0->readGate edge; ReadGate consumes
// during the same tick (topological order), so the inbound port is
// empty between ticks. P1 contract.

import type { Spec, StateValue } from "../../schema";
import { readNodeInit } from "../../sim/seeds";
import { publishHeld } from "../node-streams";
import { makeRuntime, type NodeRunner, type Runtime } from "./runtime";

export type ShapeASetup = { runtime: Runtime; edgeId: string };

export function setupShapeATicked(spec: Spec): ShapeASetup {
  const input = spec.nodes.find((n) => n.type === "Input")!;
  const readGate = spec.nodes.find((n) => n.type === "ReadGate")!;
  const edge = spec.edges.find((e) => e.source === input.id && e.target === readGate.id)!;

  const queue: StateValue[] = readNodeInit(input.data);
  let i = 0;

  const inputRunner: NodeRunner = {
    id: input.id, inEdges: [], outEdges: [edge.id],
    run: (ctx) => {
      if (queue.length === 0) return;
      const v = queue[i++ % queue.length];
      ctx.send(edge.id, v);
    },
  };
  const readGateRunner: NodeRunner = {
    id: readGate.id, inEdges: [edge.id], outEdges: [],
    run: (ctx) => {
      while (true) {
        const v = ctx.recv(edge.id);
        if (v === undefined) return;
        publishHeld(readGate.id, v);
      }
    },
  };

  const runtime = makeRuntime([inputRunner, readGateRunner], [edge.id]);
  return { runtime, edgeId: edge.id };
}
