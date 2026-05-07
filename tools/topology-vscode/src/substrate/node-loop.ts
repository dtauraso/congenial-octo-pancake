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
export function inputLoop(
  out: Wire,
  queue: readonly StateValue[],
  opts: { awaitGate?: () => Promise<void>; onTick?: () => void } = {},
): NodeLoop {
  let stopped = false;
  const done = (async () => {
    if (queue.length === 0) return;
    let i = 0;
    while (!stopped) {
      if (opts.awaitGate) await opts.awaitGate();
      if (stopped) break;
      await out.send(queue[i % queue.length]);
      opts.onTick?.();
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

// ReadGate: with autoAck (default), acks via microtask on arrive — fast
// path used by tests. With autoAck=false, the visual layer (commit 3)
// drives ack on arc completion so the wire cycle is paced by the
// renderer rather than the microtask queue.
export function readGateLoop(
  inbound: Wire,
  opts: { autoAck?: boolean; onTick?: () => void } = {},
): NodeLoop {
  const autoAck = opts.autoAck ?? true;
  let stopped = false;
  const off = inbound.onArrive(() => {
    if (stopped) return;
    opts.onTick?.();
    if (!autoAck) return;
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
