// Shared PauseSignal implementation. Step 2 of the substrate
// iteration plan: promote the test-local factory into a module so
// every forever-loop (wire, node, renderer adapter) can share one
// controller. Substrate stays timing-free — this only flips a flag
// and wakes parked awaits.

import type { PauseSignal } from "./pause-aware";

export interface PauseController extends PauseSignal {
  pause(): void;
  resume(): void;
}

export function createPauseController(): PauseController {
  let paused = false;
  let resumeWaiters: Array<() => void> = [];
  let pauseWaiters: Array<() => void> = [];
  return {
    get paused() {
      return paused;
    },
    awaitResume() {
      if (!paused) return Promise.resolve();
      return new Promise<void>((r) => resumeWaiters.push(r));
    },
    awaitPause() {
      if (paused) return Promise.resolve();
      return new Promise<void>((r) => pauseWaiters.push(r));
    },
    pause() {
      if (paused) return;
      paused = true;
      const w = pauseWaiters;
      pauseWaiters = [];
      for (const r of w) r();
    },
    resume() {
      if (!paused) return;
      paused = false;
      const w = resumeWaiters;
      resumeWaiters = [];
      for (const r of w) r();
    },
  };
}
