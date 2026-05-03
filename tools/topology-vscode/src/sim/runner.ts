// Wall-clock runner around the pure simulator. Owns one World, advances
// it on a setInterval, and publishes events to a typed EventBus that
// AnimatedNode / AnimatedEdge subscribe to. Replaces the old
// `playback.ts` master clock — there is no global `t` anymore; visible
// animation is the side-effect of simulator events firing.
//
// Per-node play/pause (N2 step-debugger) lands in Chunk D as a per-node
// pause set consulted before scheduling that node's events.

import type { Spec, StateValue } from "../schema";
import { initWorld, step, type World, type FireRecord } from "./simulator";

export type FireEvent = {
  type: "fire";
  nodeId: string;
  inputPort: string;
  inputValue: StateValue;
  // Tick + ord come from the FireRecord so listeners can correlate
  // with simulator history if needed.
  tick: number;
  ord: number;
};

export type EmitEvent = {
  type: "emit";
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  value: StateValue;
  tick: number;
};

export type RunnerEvent = FireEvent | EmitEvent;
export type RunnerListener = (e: RunnerEvent) => void;

const TICK_MS = 200;

let spec: Spec | null = null;
let world: World | null = null;
let intervalId: ReturnType<typeof setInterval> | 0 = 0;
let playing = false;
const listeners: RunnerListener[] = [];
const stateListeners: Array<() => void> = [];

export function load(next: Spec): void {
  spec = next;
  world = initWorld(next);
  notifyState();
}

export function reset(): void {
  if (!spec) return;
  world = initWorld(spec);
  notifyState();
}

export function play(): void {
  if (playing || !spec) return;
  // If we're at rest (queue drained from a previous run, or never
  // started), re-seed by resetting. Lets the play button behave as
  // "restart from seed" when nothing's queued, instead of silently
  // pausing on the first interval tick.
  if (!world || world.queue.length === 0) {
    world = initWorld(spec);
  }
  playing = true;
  // Step immediately so the user sees the first event without a 200ms
  // dead beat after pressing play.
  stepOnce();
  if (playing) intervalId = setInterval(tick, TICK_MS);
  notifyState();
}

export function pause(): void {
  if (!playing) return;
  playing = false;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = 0;
  }
  notifyState();
}

export function isPlaying(): boolean {
  return playing;
}

// One simulator step + corresponding event emission. Exposed so the
// step-debugger (Chunk D) can drive single steps without the timer.
export function stepOnce(): void {
  if (!spec || !world) return;
  if (world.queue.length === 0) {
    pause();
    notifyState();
    return;
  }
  const before = world.history.length;
  world = step(spec, world);
  const fresh = world.history.slice(before);
  for (const rec of fresh) emitEvents(rec);
  notifyState();
}

export function getWorld(): World | null {
  return world;
}

export function subscribe(fn: RunnerListener): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

// Separate channel for "anything about runner state changed" — cheap
// signal for UI affordances (play/pause button, tick label) that don't
// care about per-event payloads.
export function subscribeState(fn: () => void): () => void {
  stateListeners.push(fn);
  return () => {
    const i = stateListeners.indexOf(fn);
    if (i >= 0) stateListeners.splice(i, 1);
  };
}

function tick(): void {
  if (!spec || !world) return;
  if (world.queue.length === 0) {
    pause();
    return;
  }
  stepOnce();
}

function emitEvents(rec: FireRecord): void {
  if (!spec) return;
  const fireEvent: FireEvent = {
    type: "fire",
    nodeId: rec.nodeId,
    inputPort: rec.inputPort,
    inputValue: rec.inputValue,
    tick: rec.tick,
    ord: rec.ord,
  };
  notify(fireEvent);
  // For each emission, find the outgoing edges from (nodeId, port) and
  // emit one EmitEvent per edge. Pulse animations key off edgeId.
  for (const em of rec.emissions) {
    for (const edge of spec.edges) {
      if (edge.source === rec.nodeId && edge.sourceHandle === em.port) {
        notify({
          type: "emit",
          edgeId: edge.id,
          fromNodeId: rec.nodeId,
          toNodeId: edge.target,
          value: em.value,
          tick: rec.tick,
        });
      }
    }
  }
}

function notify(e: RunnerEvent): void {
  const n = listeners.length;
  for (let i = 0; i < n; i++) listeners[i](e);
}

function notifyState(): void {
  const n = stateListeners.length;
  for (let i = 0; i < n; i++) stateListeners[i]();
}
