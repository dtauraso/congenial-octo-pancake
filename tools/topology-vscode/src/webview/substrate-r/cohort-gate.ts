// Global play/pause gate. A single observable axis: the user (or the
// tick driver, programmatically) releases cohort N, and wires whose
// cohort === N may dispatch `arrive`. Other cohorts stay parked.
//
// Park is *in the gate*, not in the wire's value. Wires call
// `isReleased(N)` after their RAF completes; if false, they subscribe
// via `subscribe(N, cb)` and resume when the gate fires the callback.

export interface CohortGate {
  release(n: number): void;
  isReleased(n: number): boolean;
  subscribe(n: number, cb: () => void): () => void;
  readonly released: ReadonlySet<number>;
}

export function createCohortGate(): CohortGate {
  const released = new Set<number>();
  const listeners = new Map<number, Set<() => void>>();
  return {
    released,
    release(n) {
      if (released.has(n)) return;
      released.add(n);
      const ls = listeners.get(n);
      if (!ls) return;
      // Snapshot: callbacks may unsubscribe themselves during fire.
      for (const cb of [...ls]) cb();
    },
    isReleased(n) {
      return released.has(n);
    },
    subscribe(n, cb) {
      let set = listeners.get(n);
      if (!set) { set = new Set(); listeners.set(n, set); }
      set.add(cb);
      return () => { set!.delete(cb); };
    },
  };
}
