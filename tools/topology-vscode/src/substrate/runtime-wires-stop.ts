// Await-substrate stop sequence, factored out of runtime-wires.ts to
// keep that file under the LOC budget. Stops loops, acks any in-flight
// wires so pending sends resolve, and clears buffered ports.

import type { WireMap } from "./build-wires";
import type { NodeLoop } from "./node-loop";
import type { TriggerSlot } from "./runtime-wires-shapes";
import { ackWire } from "./wire";
import { clearAllBuffered } from "./node-streams";

export async function stopAwaitRuntime(
  loops: NodeLoop[],
  wires: WireMap | null,
  triggers: TriggerSlot[],
): Promise<void> {
  // Wake any loops parked at awaitOpen so they observe stopped=true.
  for (const t of triggers) t.gate.wake();
  // Kick off loop stops first (sets each loop's stopped=true
  // synchronously), THEN ack any in-flight wires so pending sends
  // resolve and the loops see stopped=true on the next iteration.
  const stops = loops.map((l) => l.stop());
  if (wires) for (const w of wires.values()) if (w.state === "inFlight") ackWire(w);
  await Promise.all(stops);
  clearAllBuffered();
}
