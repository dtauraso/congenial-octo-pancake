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
import { ackWire, type Wire, type WireValue } from "./wire";

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
      await out.awaitReady();
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

// First multi-input node loop. Awaits one value per inbound wire,
// reduces, gates the outbound on awaitReady, sends, and then acks each
// inbound. The reduce closure is the node-specific compute; the loop
// shape itself is the same for any AND-style join.
//
// The inbound[] order is preserved into reduce(values), so the caller
// can map indices to ports. awaitValue does NOT ack — that's why the
// explicit ackWire pass at the end is required.
export function andGateLoop(
  inbound: readonly Wire[],
  out: Wire,
  reduce: (values: readonly WireValue[]) => WireValue,
  opts: { onTick?: () => void } = {},
): NodeLoop {
  let stopped = false;
  let wakeCurrent: (() => void) | null = null;
  const racedWithStop = <T>(p: Promise<T>): Promise<T | "stop"> => {
    return new Promise<T | "stop">((resolve) => {
      wakeCurrent = () => resolve("stop");
      p.then((v) => resolve(v), (err) => resolve(err));
    });
  };
  const done = (async () => {
    while (!stopped) {
      const r = await racedWithStop(Promise.all(inbound.map((w) => w.awaitValue())));
      wakeCurrent = null;
      if (stopped || r === "stop") break;
      const result = reduce(r as readonly WireValue[]);
      const r2 = await racedWithStop(out.awaitReady());
      wakeCurrent = null;
      if (stopped || r2 === "stop") break;
      await out.send(result);
      for (const w of inbound) ackWire(w);
      opts.onTick?.();
    }
  })();
  return {
    async stop() {
      stopped = true;
      wakeCurrent?.();
      wakeCurrent = null;
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
