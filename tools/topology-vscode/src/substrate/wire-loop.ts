// The wire's forever-loop. Per handoff-substrate-iteration.md:
//   await source loaded me, await destination took me, ack source.
//
// The wire does not pull values; the source node calls `load(v)` and
// the destination node calls `take()`. This loop observes those
// transitions and closes the round by acking. Coordination is
// backpressure at each await; pause is line-level via pauseAware.

import type { Wire } from "./wire-entity";
import { pauseAware, type PauseSignal } from "./pause-aware";

export interface WireLoopHandle {
  stop(): void;
  done: Promise<void>;
}

export function runWire<V>(
  wire: Wire<V>,
  pause?: PauseSignal,
): WireLoopHandle {
  let running = true;
  const done = (async () => {
    while (running) {
      await pauseAware(() => wire.awaitLoaded(), pause);
      if (!running) return;
      await pauseAware(() => takenSignal(wire), pause);
      if (!running) return;
      if (wire.state.kind === "carrying") wire.ack();
    }
  })();
  return { stop: () => { running = false; }, done };
}

function takenSignal<V>(wire: Wire<V>): Promise<void> {
  return new Promise<void>((resolve) => {
    const off = wire.onEvent((e) => {
      if (e.kind === "taken") { off(); resolve(); }
    });
  });
}
