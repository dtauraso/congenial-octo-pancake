// Pause-aware wait helper. Per handoff-substrate-iteration.md:
// every wait in a forever-loop body races the underlying state
// change against the pause signal. On pause, the loop parks; on
// resume, it re-awaits the same state change. No bare awaits.
//
// PauseSignal is a minimal interface so wire-entity / node-loop can
// depend on it without pulling in a controller implementation. The
// shared controller module lands in step 2 of the iteration plan.

export interface PauseSignal {
  readonly paused: boolean;
  awaitResume(): Promise<void>;
  awaitPause(): Promise<void>;
}

export async function pauseAware<T>(
  make: () => Promise<T>,
  pause?: PauseSignal,
): Promise<T> {
  if (!pause) return make();
  if (pause.paused) await pause.awaitResume();
  const work = make();
  while (true) {
    const winner = await Promise.race([
      work.then((v) => ({ tag: "done" as const, v })),
      pause.awaitPause().then(() => ({ tag: "paused" as const })),
    ]);
    if (winner.tag === "done") return winner.v;
    // Paused mid-wait: park until resume, then re-race the SAME
    // work promise. Edge events that fired during pause are
    // preserved by the underlying promise.
    await pause.awaitResume();
  }
}
