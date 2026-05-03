// Wall-clock runner around the pure simulator. Owns one World, advances
// it on a setInterval, and publishes events to a typed EventBus that
// AnimatedNode / AnimatedEdge subscribe to. Replaces the old
// `playback.ts` master clock — there is no global `t` anymore; visible
// animation is the side-effect of simulator events firing.

import type { Spec, StateValue, Edge } from "../schema";
import {
  initWorld,
  replayTo,
  step,
  enqueueEmission,
  type World,
  type FireRecord,
} from "./simulator";
import { classifyConcurrentEdges } from "./concurrency";
import { getHandler } from "./handlers";
import { NODE_TYPES } from "../schema";
import type { TraceEvent } from "./trace";

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
let concurrentEdges: Set<string> = new Set();
let intervalId: ReturnType<typeof setInterval> | 0 = 0;
let playing = false;
let replayEvents: TraceEvent[] | null = null;
let replayIndex = 0;
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
  concurrentEdges = classifyConcurrentEdges(next);
  replayEvents = null;
  replayIndex = 0;
  notifyState();
}

// Replay mode: drive the runner from a recorded TraceEvent[] instead of
// running the live simulator. Each tick advances one trace event:
//   recv → re-run the receiving node's handler so world.state stays in
//          sync (Phase 6 motion reads world.state.dx/dy); emit FireEvent
//   send → emit EmitEvent on the named edge
//   fire → no-op (the FireEvent already fired on recv)
// The simulator queue is left empty in this mode; trace order is the
// only authority. Once Go emits traces (Chunk 3), this same path
// renders them.
export function loadTrace(nextSpec: Spec, events: readonly TraceEvent[]): void {
  spec = nextSpec;
  world = initWorld(nextSpec);
  if (world) world.queue = [];
  concurrentEdges = classifyConcurrentEdges(nextSpec);
  replayEvents = events.slice();
  replayIndex = 0;
  notifyState();
}

export function isReplaying(): boolean {
  return replayEvents !== null;
}

// Read-only view of the current concurrent-edge classification. The
// AnimatedEdge component reads this to decide whether to render the
// concurrency-reveal stroke overlay. Re-runs on every load(); spec
// edits flow through there.
export function getConcurrentEdges(): ReadonlySet<string> {
  return concurrentEdges;
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
  if (replayEvents) {
    if (replayIndex >= replayEvents.length) {
      replayIndex = 0;
      world = initWorld(spec);
      if (world) world.queue = [];
    }
  } else if (!world || world.queue.length === 0) {
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
  if (replayEvents) {
    replayStepOnce();
    return;
  }
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

// Consume one trace event. recv → run handler + emit FireEvent;
// send → emit EmitEvent; fire → no-op. Stops replay when exhausted.
function replayStepOnce(): void {
  if (!spec || !world || !replayEvents) return;
  if (replayIndex >= replayEvents.length) {
    pause();
    notifyState();
    return;
  }
  const ev = replayEvents[replayIndex++];
  if (ev.kind === "recv") {
    const node = spec.nodes.find((n) => n.id === ev.node);
    const handler = node ? getHandler(node.type, ev.port) : undefined;
    if (handler && node) {
      const prev = world.state[ev.node] ?? {};
      const def = NODE_TYPES[node.type];
      const props = { ...(def?.defaultProps ?? {}), ...(node.props ?? {}) };
      const result = handler(prev, { port: ev.port, value: ev.value }, props);
      world.state = { ...world.state, [ev.node]: result.state };
    }
    notify({
      type: "fire",
      nodeId: ev.node,
      inputPort: ev.port,
      inputValue: ev.value,
      tick: world.tick,
      ord: replayIndex,
    });
  } else if (ev.kind === "send") {
    const edge = findEdge(spec, ev.edge);
    if (edge) {
      notify({
        type: "emit",
        edgeId: edge.id,
        fromNodeId: edge.source,
        toNodeId: edge.target,
        value: ev.value,
        tick: world.tick,
      });
    }
  }
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
  if (replayEvents) {
    if (replayIndex >= replayEvents.length) {
      pause();
      return;
    }
    stepOnce();
    return;
  }
  if (world.queue.length === 0) {
    pause();
    return;
  }
  stepOnce();
}

function emitEvents(rec: FireRecord): void {
  if (!spec || !world) return;
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
  // N1' concurrency-reveal self-pacer: pulse N just arrived at target
  // via rec.inEdgeId. If that edge is concurrent, fire pulse N+1 from
  // its source on the same port with the same value, scheduled one
  // edge-delay ahead. This produces the continuous re-firing loop that
  // makes parallel regions of the topology visible.
  if (rec.inEdgeId && concurrentEdges.has(rec.inEdgeId)) {
    const edge = findEdge(spec, rec.inEdgeId);
    if (edge) {
      enqueueEmission(
        spec,
        world,
        edge.source,
        edge.sourceHandle,
        rec.inputValue,
        world.tick + 1,
      );
      notify({
        type: "emit",
        edgeId: edge.id,
        fromNodeId: edge.source,
        toNodeId: edge.target,
        value: rec.inputValue,
        tick: world.tick,
      });
    }
  }
}

function findEdge(s: Spec, id: string): Edge | undefined {
  for (const e of s.edges) if (e.id === id) return e;
  return undefined;
}

function notify(e: RunnerEvent): void {
  const n = listeners.length;
  for (let i = 0; i < n; i++) listeners[i](e);
}

function notifyState(): void {
  const n = stateListeners.length;
  for (let i = 0; i < n; i++) stateListeners[i]();
}
