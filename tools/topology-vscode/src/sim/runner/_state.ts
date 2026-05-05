// Singleton mutable state for the runner. All submodules read/write
// through this object so updates are visible across files without
// relying on ES live bindings of `let` exports.

import type { Spec, Edge } from "../../schema";
import type { World } from "../simulator";
import type { TraceEvent } from "../trace";

export const TICK_MIN = 60;
export const TICK_MAX = 1500;

export const state = {
  tickMs: 400,
  spec: null as Spec | null,
  world: null as World | null,
  concurrentEdges: new Set<string>() as Set<string>,
  intervalId: 0 as ReturnType<typeof setInterval> | 0,
  playing: false,
  // Unified sim clock — see runner.ts header comment for why this
  // replaces per-site pauseStart/pausedRemainingMs bookkeeping.
  simAccumMs: 0,
  simSegmentStartWall: 0,
  // Pinned during a synchronous step so all side-effects share one
  // timestamp (DES "events execute at one scheduled now").
  stepSimTime: null as number | null,
  replayEvents: null as TraceEvent[] | null,
  replayIndex: 0,
  stuckLogged: false,
  activeAnimations: 0,
  cycleRestartTimer: null as ReturnType<typeof setTimeout> | null,
};

export function nowWall(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function liveSimTime(): number {
  return state.playing
    ? state.simAccumMs + (nowWall() - state.simSegmentStartWall)
    : state.simAccumMs;
}

export function getSimTime(): number {
  return state.stepSimTime ?? liveSimTime();
}

export function findEdge(s: Spec, id: string): Edge | undefined {
  for (const e of s.edges) if (e.id === id) return e;
  return undefined;
}
