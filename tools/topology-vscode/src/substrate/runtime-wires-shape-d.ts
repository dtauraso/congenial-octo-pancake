// Shape D setup: Shape C plus i0.out -> i1.in, closing the cycle.
// i0 stops being a sink — it passthroughs readGate.out to i1.in via
// andGateLoop. i1 stops being driven by a synthetic unit queue — it
// passthroughs i0.out to readGate.ack via andGateLoop. The two
// manual-ack edges (in0->readGate, i1->readGate) are unchanged.
//
// Cycle seed: a one-shot send onto ackWireE at startup gives readGate
// the first ack-side token so its andGateLoop can take its first ready
// slot. Without this, readGate, i0, i1 each park on awaitValue and the
// cycle never starts. Subsequent acks come from i1's andGateLoop once
// the value has propagated readGate -> i0 -> i1.

import type { Spec, StateValue } from "../schema";
import { readNodeInit } from "../sim/seeds";
import type { WireMap } from "./build-wires";
import { type NodeLoop } from "./node-loop";
import { andGateLoopWithCycleInputs, andGateLoopFanOut } from "./node-loop-cycle";
import type { Wire, WireValue } from "./wire";
import {
  publishHeld, publishTick,
  markBuffered, clearBuffered,
} from "./node-streams";
import type { ShapeSetup } from "./runtime-wires-shapes";

export function setupInputReadGateInhibitorCycle(
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
  const i1 = inhibitors.find((n) => n.id === ackEdge.source)!;
  const i0 = inhibitors.find((n) => n.id !== i1.id)!;
  const outEdge = spec.edges.find(
    (e) => e.source === readGate.id && e.target === i0.id
      && e.sourceHandle === "out" && e.targetHandle === "in",
  )!;
  const cycleEdge = spec.edges.find(
    (e) => e.source === i0.id && e.target === i1.id
      && e.sourceHandle === "out" && e.targetHandle === "in",
  )!;

  const inWire = wires.get(chainEdge.id)!;
  const ackWireE = wires.get(ackEdge.id)!;
  const outWire = wires.get(outEdge.id)!;
  const cycleWire = wires.get(cycleEdge.id)!;

  inWire.onArrive((v) => publishHeld(readGate.id, v as StateValue));
  inWire.onArrive(() => markBuffered(readGate.id, "chainIn"));
  inWire.onAck(() => clearBuffered(readGate.id, "chainIn"));
  ackWireE.onArrive(() => markBuffered(readGate.id, "ack"));
  ackWireE.onAck(() => clearBuffered(readGate.id, "ack"));
  outWire.onArrive((v) => publishHeld(i0.id, v as StateValue));
  outWire.onArrive(() => markBuffered(i0.id, "in"));
  outWire.onAck(() => clearBuffered(i0.id, "in"));
  cycleWire.onArrive((v) => publishHeld(i1.id, v as StateValue));
  cycleWire.onArrive(() => markBuffered(i1.id, "in"));
  cycleWire.onAck(() => clearBuffered(i1.id, "in"));

  const inputQueue = readNodeInit(input.data);
  void awaitGate;
  const seedValue = (inputQueue[0] ?? (0 as unknown as StateValue)) as WireValue;
  return {
    loops: [
      andGateLoopWithCycleInputs(
        [inWire, ackWireE],
        [true, true],
        outWire,
        ([chainInVal]) => chainInVal,
        { onTick: () => publishTick(readGate.id) },
      ),
      andGateLoopWithCycleInputs(
        [outWire],
        [true],
        cycleWire,
        ([v]) => v,
        { onTick: () => publishTick(i0.id) },
      ),
      andGateLoopFanOut(
        [cycleWire],
        [true],
        [ackWireE, inWire],
        ([v]) => v,
        { onTick: () => publishTick(i1.id) },
      ),
      seedLoop(ackWireE, 1 as unknown as StateValue),
      seedLoop(inWire, seedValue, () => publishTick(input.id)),
    ],
    manualAckEdges: [],
    selfAckEdges: [ackEdge.id, chainEdge.id, outEdge.id, cycleEdge.id],
  };
}

function seedLoop(out: Wire, value: WireValue, onSent?: () => void): NodeLoop {
  let stopped = false;
  const done = (async () => {
    if (stopped) return;
    await out.awaitReady();
    if (stopped) return;
    await out.send(value);
    onSent?.();
  })();
  return {
    async stop() {
      stopped = true;
      await done.catch(() => undefined);
    },
  };
}
