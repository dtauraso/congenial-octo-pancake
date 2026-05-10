// Shape A — pair substrate. Two wires, two callback state machines,
// no ticks, no `await` in node bodies, no driver. The visual pulse
// arc is the only timer; usePulseLanesWire calls ackWire(wForward)
// on arrival, which gates the next permit.
//
// Diagnostic: if pulses space cleanly here, the step substrate's
// same-tick drain was the cause. If they still stack, the bug is in
// the visual layer (geometry/lanes), not the substrate. See
// docs/planning/visual-editor/handoff-next-task.md.

import type { Spec, StateValue } from "../schema";
import { readNodeInit } from "../sim/seeds";
import type { WireMap } from "./build-wires";
import { ackWire, createWire } from "./wire";
import {
  publishHeld, publishTick,
  markBuffered, clearBuffered,
} from "./node-streams";
import type { ShapeSetup } from "./runtime-wires-shapes";

const noop = (): void => undefined;

let _activeStop: (() => void) | null = null;

export function setupInputReadGatePair(spec: Spec, wires: WireMap): ShapeSetup {
  const input = spec.nodes.find((n) => n.type === "Input")!;
  const readGate = spec.nodes.find((n) => n.type === "ReadGate")!;
  const edge = spec.edges.find((e) => e.source === input.id && e.target === readGate.id)!;
  const wForward = wires.get(edge.id)!;
  // Internal back-channel; not a spec edge, not animated.
  const wPermit = createWire(`${input.id}__permit__${readGate.id}`, 1);

  const queue = readNodeInit(input.data);
  const inPort = edge.targetHandle ?? "in";
  let i = 0;
  let stopped = false;

  // Receiver-side instrumentation on wForward (matches existing shapes).
  wForward.onArrive((v) => publishHeld(readGate.id, v as StateValue));
  wForward.onArrive(() => markBuffered(readGate.id, inPort));
  wForward.onAck(() => clearBuffered(readGate.id, inPort));

  // readGate callback machine: arrive → publish; ack (visual layer
  // fires this on pulse-arc completion) → release next permit.
  wForward.onArrive(() => publishTick(readGate.id));
  wForward.onAck(() => {
    if (stopped) return;
    if (queue.length === 0) return;
    wPermit.send("go").catch(noop);
  });

  // in0 callback machine: permit arrived → consume it, send next value.
  wPermit.onArrive(() => {
    if (stopped) return;
    ackWire(wPermit);
    if (queue.length === 0) return;
    const v = queue[i++ % queue.length];
    publishTick(input.id);
    wForward.send(v).catch(noop);
  });

  // Seed: prime the permit so in0 fires its first send.
  if (queue.length > 0) {
    wPermit.send("go").catch(noop);
  }

  _activeStop = () => { stopped = true; };

  return {
    loops: [],
    // wForward is held until the user clicks the "clear slot" button,
    // which calls ackWire(wForward) and triggers the permit-release
    // handler above. wPermit is internal, never visible to the
    // visual layer.
    manualAckEdges: [{ id: edge.id, label: "in0→readGate" }],
  };
}

export function stopInputReadGatePair(): void {
  if (_activeStop) {
    _activeStop();
    _activeStop = null;
  }
}
