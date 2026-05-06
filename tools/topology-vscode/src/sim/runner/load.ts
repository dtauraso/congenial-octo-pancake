// Lifecycle + getters: load a spec, swap in a trace, reset, and the
// small read accessors the rest of the app calls.

import type { Spec } from "../../schema";
import type { World } from "../simulator";
import type { TraceEvent } from "../trace";
import { classifyConcurrentEdges } from "../concurrency";
import { notifyState } from "../event-bus";
import { state, TICK_MIN, TICK_MAX } from "./_state";
import { initWorldForRun } from "./_init";
import { cancelCycleRestart } from "./cycle-restart";
import { resetCadence } from "../../cadence/in0ReadGateAck";

export function getTickMs(): number {
  return state.tickMs;
}

export function setTickMs(ms: number): void {
  state.tickMs = Math.max(TICK_MIN, Math.min(TICK_MAX, Math.round(ms)));
  if (state.intervalId) {
    // Re-arm the interval with the new period. Lazy-imported to avoid
    // a load → playback → load cycle.
    const { rearmInterval } = require("./playback") as typeof import("./playback");
    rearmInterval();
  }
  notifyState();
}

export function load(next: Spec): void {
  cancelCycleRestart();
  resetCadence();
  state.spec = next;
  state.world = initWorldForRun(next);
  state.concurrentEdges = classifyConcurrentEdges(next);
  state.replayEvents = null;
  state.replayIndex = 0;
  notifyState();
}

export function loadTrace(nextSpec: Spec, events: readonly TraceEvent[]): void {
  state.spec = nextSpec;
  state.world = initWorldForRun(nextSpec);
  if (state.world) state.world.queue = [];
  state.concurrentEdges = classifyConcurrentEdges(nextSpec);
  state.replayEvents = events.slice();
  state.replayIndex = 0;
  notifyState();
}

export function isReplaying(): boolean {
  return state.replayEvents !== null;
}

export function getConcurrentEdges(): ReadonlySet<string> {
  return state.concurrentEdges;
}

export function reset(): void {
  if (!state.spec) return;
  cancelCycleRestart();
  resetCadence();
  state.world = initWorldForRun(state.spec);
  state.stuckLogged = false;
  notifyState();
}

export function getWorld(): World | null {
  return state.world;
}
