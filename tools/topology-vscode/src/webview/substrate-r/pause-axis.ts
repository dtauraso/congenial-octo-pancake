// Substrate-level pause axis. A single observable bool every wire's
// RAF reads. When true, each wire freezes its pulse and delivery
// locally — no central authority is consulted. On resume, each wire
// rebases its sim clock so the pulse continues from where it stopped.
//
// Distinct from the cohort gate. The gate's released set is monotonic
// (release-only) and is the wrong axis for pause: after one lap every
// cohort ≥1 is permanently released. Pause must apply to all in-flight
// wires regardless of cohort, so it lives on its own toggleable axis.

export interface PauseAxis {
  readonly paused: boolean;
  set(paused: boolean): void;
  subscribe(cb: (paused: boolean) => void): () => void;
}

export function createPauseAxis(initial = false): PauseAxis {
  let paused = initial;
  const listeners = new Set<(p: boolean) => void>();
  return {
    get paused() { return paused; },
    set(next) {
      if (paused === next) return;
      paused = next;
      for (const cb of [...listeners]) cb(next);
    },
    subscribe(cb) {
      listeners.add(cb);
      return () => { listeners.delete(cb); };
    },
  };
}
