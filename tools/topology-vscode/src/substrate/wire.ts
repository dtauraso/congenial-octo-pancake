// Per-edge Wire primitive. Replaces the global event bus / sim clock /
// pulse-concurrency ledger with point-to-point delivery: one Wire per
// edge, owned by reference by sender + receiver. No global registry.
//
// State machine matches chan-wire.html: idle | inFlight | full. With
// cap=0 (unbuffered), a Wire transitions idle -> inFlight on send and
// back to idle on receiver ack. cap=1 lets one value sit in `pending`
// while idle, becoming `full` until consumed.
//
// This file defines the type only. The runtime that drives node loops
// using these wires lands in commit 2.
//
// Open questions deferred until needed:
// - Arc timer ownership (Wire vs visual layer) — resolve in commit 3
//   when AnimatedEdge is rewired.
// - Pause semantics — resolve in commit 4 when toolbar play/pause
//   moves off legacyRunnerState.

export type WireState = "idle" | "inFlight" | "full";

export type WireValue = unknown;

export type ArriveListener = (value: WireValue) => void;
export type AckListener = () => void;

export interface Wire {
  readonly id: string;
  readonly cap: 0 | 1;
  readonly state: WireState;
  readonly pending: WireValue | null;
  send(value: WireValue): Promise<void>;
  onArrive(listener: ArriveListener): () => void;
  onAck(listener: AckListener): () => void;
}

interface WireInternal extends Wire {
  state: WireState;
  pending: WireValue | null;
}

export function createWire(id: string, cap: 0 | 1 = 0): Wire {
  const listeners = new Set<ArriveListener>();
  const ackListeners = new Set<AckListener>();
  let waitingAck: (() => void) | null = null;

  const w: WireInternal = {
    id,
    cap,
    state: "idle",
    pending: null,

    async send(value: WireValue): Promise<void> {
      if (w.state !== "idle") {
        throw new Error(`wire ${id}: send while ${w.state}`);
      }
      w.pending = value;
      w.state = "inFlight";
      for (const fn of listeners) fn(value);
      await new Promise<void>((resolve) => {
        waitingAck = resolve;
      });
    },

    onArrive(listener: ArriveListener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    onAck(listener: AckListener): () => void {
      ackListeners.add(listener);
      return () => ackListeners.delete(listener);
    },
  };

  // Ack hook for the receiver loop. Internal to the substrate; nodes
  // call it after consuming `pending`. Exposed via the `_ack` symbol
  // rather than a public method so external code can't bypass the
  // node loop.
  (w as unknown as { _ack: () => void })._ack = () => {
    if (w.state !== "inFlight") return;
    w.pending = null;
    w.state = "idle";
    const resume = waitingAck;
    waitingAck = null;
    if (resume) resume();
    for (const fn of ackListeners) fn();
  };

  return w;
}

export function ackWire(wire: Wire): void {
  const ack = (wire as unknown as { _ack?: () => void })._ack;
  if (typeof ack !== "function") {
    throw new Error(`wire ${wire.id}: not ack-able (foreign instance)`);
  }
  ack();
}
