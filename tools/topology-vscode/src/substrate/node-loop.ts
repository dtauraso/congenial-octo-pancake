// Per-node async loops that read inbound Wires and write outbound.
// Commit 2 of revised step 1: substrate runtime, no legacy coupling
// (no event-bus, no legacyRunnerState, no pulse-concurrency ledger).
//
// Trivial topology only: Input -> ReadGate. Two loops total.
//
// The arc timer (visual traversal duration) is deferred to commit 3
// when AnimatedEdge is rewired. For now ReadGate acks as soon as
// onArrive fires, which keeps the wire's idle->inFlight->idle cycle
// observable in tests but instantaneous in real time.

import type { StateValue } from "../schema";
import { ackWire, type Wire } from "./wire";

export type NodeLoop = { stop(): Promise<void> };

// Input: cycle through a fixed queue, sending each value on the
// outbound wire. send() resolves only after the receiver acks, so
// back-pressure falls out of the wire contract — no scheduler.
export function inputLoop(out: Wire, queue: readonly StateValue[]): NodeLoop {
  let stopped = false;
  const done = (async () => {
    if (queue.length === 0) return;
    let i = 0;
    while (!stopped) {
      await out.send(queue[i % queue.length]);
      i += 1;
    }
  })();
  return {
    async stop() {
      stopped = true;
      await done.catch(() => undefined);
    },
  };
}

// ReadGate: ack on arrival. Real read semantics land when the node
// type is properly ported; for now this is enough to close the loop
// and let the wire cycle.
export function readGateLoop(inbound: Wire): NodeLoop {
  let stopped = false;
  const off = inbound.onArrive(() => {
    if (stopped) return;
    queueMicrotask(() => {
      if (stopped) return;
      ackWire(inbound);
    });
  });
  return {
    async stop() {
      stopped = true;
      off();
    },
  };
}
