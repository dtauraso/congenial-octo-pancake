// Wall-clock runner around the pure simulator. Owns one World, advances
// it on a setInterval, and publishes events to a typed EventBus that
// AnimatedNode / AnimatedEdge subscribe to. Replaces the old
// `playback.ts` master clock — there is no global `t` anymore; visible
// animation is the side-effect of simulator events firing.

import type { Spec, StateValue } from "../schema";
import { initWorld, replayTo, step, type World, type FireRecord } from "./simulator";

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

// User-tunable tick interval. The user-facing speed slider in
// timeline.ts writes here; faster topologies still run at the spec's
// own `delay` cadence — the slider only paces the wall clock between
// step() calls.
let tickMs = 400;
const TICK_MIN = 60;
const TICK_MAX = 1500;

let spec: Spec | null = null;
let world: World | null = null;
let intervalId: ReturnType<typeof setInterval> | 0 = 0;
let playing = false;
const listeners: RunnerListener[] = [];
const stateListeners: Array<() => void> = [];

export function getTickMs(): number {
  return tickMs;
}

export function setTickMs(ms: number): void {
  tickMs = Math.max(TICK_MIN, Math.min(TICK_MAX, Math.round(ms)));
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = setInterval(tick, tickMs);
  }
  notifyState();
}

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
  if (playing) intervalId = setInterval(tick, tickMs);
  notifyState();
}

// N2 step-debugger: drive the simulator until the next event arrives at
// `nodeId`, then stop. Lets the user single-step a particular node
// without globally pausing/resuming. If no future event reaches that
// node before the queue drains, returns silently.
export function stepToNode(nodeId: string): void {
  if (!spec || !world) return;
  pause();
  const target = world.history.length;
  // Walk events until one delivered to nodeId is processed, or we
  // drain. Cap to keep runaway topologies from hanging the UI.
  for (let i = 0; i < 5000; i++) {
    if (world.queue.length === 0) break;
    stepOnce();
    if (!world) break;
    const fresh = world.history.slice(target);
    if (fresh.some((r) => r.nodeId === nodeId)) break;
  }
}

// Bookmark resume: F1 deterministic replay to `cycle`, then leave the
// runner paused so the step-debugger can take over. `startNodeId` is
// recorded for the UI but doesn't change cycle math — bookmarks are
// just (cycle, focus-node) pairs.
export function jumpTo(cycle: number, _startNodeId: string): void {
  if (!spec) return;
  pause();
  world = replayTo(spec, cycle);
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
