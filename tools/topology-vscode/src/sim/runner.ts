// Wall-clock runner around the pure simulator. Owns one World, advances
// it on a setInterval, and publishes events to a typed EventBus that
// AnimatedNode / AnimatedEdge subscribe to. Replaces the old
// `playback.ts` master clock — there is no global `t` anymore; visible
// animation is the side-effect of simulator events firing.

import type { Spec, StateValue, Edge } from "../schema";
import {
  freeEdgeSlot,
  initWorld,
  noteEdgeAnimEnded,
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
import {
  notify,
  notifyState,
  type FireEvent,
} from "./event-bus";
import { reportRunnerError } from "./error-probe";

export {
  subscribe,
  subscribeState,
  type FireEvent,
  type EmitEvent,
  type RunnerEvent,
  type RunnerListener,
} from "./event-bus";
export { reportRunnerError } from "./error-probe";

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
// Unified sim clock. Advances with wall time while playing, frozen on
// pause. All animation/decay timing reads `getSimTime()` instead of
// `Date.now()`/`performance.now()`, so a single play-state transition
// freezes/resumes every animation in lockstep — replaces the per-site
// pauseStart/pausedRemainingMs bookkeeping that AnimatedEdge and
// fold-activity each reinvented.
let simAccumMs = 0;
let simSegmentStartWall = 0;
// While a synchronous step is executing, simTime is pinned to the value
// captured at the top of that step. All fire/emit/anim-start side-effects
// of one event share this timestamp — DES "events execute at a single
// scheduled now" semantics. Outside a step, getSimTime() falls back to
// the wall-derived value so anim-end / heartbeat reads still advance.
let stepSimTime: number | null = null;
function nowWall(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
function liveSimTime(): number {
  return playing ? simAccumMs + (nowWall() - simSegmentStartWall) : simAccumMs;
}
export function getSimTime(): number {
  return stepSimTime ?? liveSimTime();
}
let replayEvents: TraceEvent[] | null = null;
let replayIndex = 0;

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

// Wrap initWorld so the runner-managed world always pins slot release
// to anim-end (deferSlotFreeToView). Without this, slots free the
// millisecond a handler runs and the simulator dispatches the next emit
// while the previous pulse is still mid-flight visually — multiple
// pulses accumulate on the edge. Headless tests call initWorld directly
// and keep the default false.
function initWorldForRun(s: Spec): World {
  const w = initWorld(s);
  w.deferSlotFreeToView = true;
  return w;
}

// "At rest" means: nothing queued, no future seeds, no values parked on
// edges waiting for the view's anim-end to release their slot, AND no
// pulses still occupying edge slots (slotsUsed). With deferSlotFreeToView
// the queue can drain while pulses are still mid-flight; treating that
// as quiescent would reset the world on the next play() and replay seeds
// from tick 0.
function hasPendingWork(w: World): boolean {
  if (w.queue.length > 0) return true;
  if (w.pendingSeeds.length > 0) return true;
  for (const k in w.edgePending) {
    if (w.edgePending[k].length > 0) return true;
  }
  for (const k in w.edgeOccupancy) {
    if (w.edgeOccupancy[k] > 0) return true;
  }
  return false;
}

export function load(next: Spec): void {
  cancelCycleRestart();
  spec = next;
  world = initWorldForRun(next);
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
  world = initWorldForRun(nextSpec);
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
  cancelCycleRestart();
  world = initWorldForRun(spec);
  stuckLogged = false;
  notifyState();
}

// View → sim bridge: AnimatedEdge calls this when a pulse animation
// finishes. Frees the edge's slot (and any nodeBufferedEdges entries
// keyed to it on its destination), promotes a pending emission onto
// the queue if the slot was holding one back, and steps the simulator
// forward if the runner is playing — so a freshly-released emission
// doesn't have to wait for the next interval tick to dispatch.
// Active visible animations. Incremented on AnimatedEdge mount,
// decremented on unmount. Source of truth for "is the screen
// visually quiet" — used to gate continuous-cycle restart so we
// never wipe sim state while a pulse is still in flight on screen.
let activeAnimations = 0;

export function noteEdgePulseStarted(_edgeId: string): void {
  activeAnimations++;
}

export function noteEdgePulseEnded(edgeId: string): void {
  if (activeAnimations > 0) activeAnimations--;
  if (!spec || !world) return;
  if (!world.deferSlotFreeToView) return;
  // Slot release is gated on (animEnded AND consumed). This call marks
  // animEnded; if the destination handler has already fired and cleared
  // its buffer for this edge, the slot frees now. Otherwise the slot
  // stays held until the handler fires — mirroring Go's cap-1 channel
  // where the upstream send blocks until the receiver consumes the
  // buffered value into a fire (e.g. ReadGate's chainIn waits for ack).
  noteEdgeAnimEnded(world, edgeId, spec, world.tick);
  if (playing) {
    try { stepOnce(); }
    catch (err) { reportRunnerError("listener", err); }
  }
  notifyState();
}

export function play(): void {
  if (playing || !spec) return;
  cancelCycleRestart();
  // If we're at rest (queue drained from a previous run, or never
  // started), re-seed by resetting. Lets the play button behave as
  // "restart from seed" when nothing's queued, instead of silently
  // pausing on the first interval tick.
  if (replayEvents) {
    if (replayIndex >= replayEvents.length) {
      replayIndex = 0;
      world = initWorldForRun(spec);
      if (world) world.queue = [];
    }
  } else if (!world || !hasPendingWork(world)) {
    world = initWorldForRun(spec);
    stuckLogged = false;
  }
  playing = true;
  simSegmentStartWall = nowWall();
  // Step immediately so the user sees the first event without a 200ms
  // dead beat after pressing play. Wrap so a thrown handler doesn't
  // leave us in playing=true with no interval set (the "stuck pause"
  // UI symptom).
  try {
    stepOnce();
  } catch (err) {
    reportRunnerError("stepOnce", err);
    playing = false;
    notifyState();
    return;
  }
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
  simAccumMs += nowWall() - simSegmentStartWall;
  playing = false;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = 0;
  }
  cancelCycleRestart();
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
    // Queue empty + no future seeds = end of a cycle. Don't pause —
    // schedule a debounced re-seed so the animation runs continuously.
    // The quiet window lets in-flight visible pulses finish before the
    // next cycle starts. User pause() cancels the timer.
    if (world.pendingSeeds.length === 0) {
      scheduleCycleRestart();
    }
    return;
  }
  const before = world.history.length;
  stepSimTime = liveSimTime();
  try {
    world = step(spec, world);
    const fresh = world.history.slice(before);
    for (const rec of fresh) emitEvents(rec);
  } finally {
    stepSimTime = null;
  }
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
  stepSimTime = liveSimTime();
  try {
    replayDispatch(ev);
  } finally {
    stepSimTime = null;
  }
  notifyState();
}

function replayDispatch(ev: TraceEvent): void {
  if (!spec || !world) return;
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
}

export function getWorld(): World | null {
  return world;
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
    if (world.pendingSeeds.length === 0) {
      scheduleCycleRestart();
    } else {
      logStuckPendingOnce(world);
    }
    return;
  }
  stepOnce();
}

let stuckLogged = false;

// Continuous-cycle auto-restart. When the queue + pendingSeeds drain
// we don't pause — we wait until both the sim is quiet AND no
// AnimatedEdge is still in flight on screen, then re-seed from spec.
// Gating on activeAnimations (not a wall-clock guess) is what makes
// the "at most one pulse per visible edge" invariant hold across
// cycle boundaries: re-seeding while a pulse is still animating
// emits a second pulse onto the same edge before the first ends.
// User pause cancels the pending re-seed; user play schedules a
// fresh cycle if needed.
const CYCLE_RESTART_QUIET_MS = 2000;
const CYCLE_RESTART_RECHECK_MS = 250;
let cycleRestartTimer: ReturnType<typeof setTimeout> | null = null;
function cancelCycleRestart(): void {
  if (cycleRestartTimer !== null) {
    clearTimeout(cycleRestartTimer);
    cycleRestartTimer = null;
  }
}
function scheduleCycleRestart(): void {
  if (cycleRestartTimer !== null) return;
  cycleRestartTimer = setTimeout(tryCycleRestart, CYCLE_RESTART_QUIET_MS);
}
function tryCycleRestart(): void {
  cycleRestartTimer = null;
  if (!playing || !spec || !world) return;
  if (world.queue.length > 0 || world.pendingSeeds.length > 0) return;
  if (activeAnimations > 0) {
    cycleRestartTimer = setTimeout(tryCycleRestart, CYCLE_RESTART_RECHECK_MS);
    return;
  }
  world = initWorldForRun(spec);
  stuckLogged = false;
  try { stepOnce(); }
  catch (err) { reportRunnerError("stepOnce", err); }
  notifyState();
}
function logStuckPendingOnce(w: World): void {
  if (stuckLogged) return;
  stuckLogged = true;
  const occ: Record<string, number> = {};
  for (const k in w.edgeOccupancy) if (w.edgeOccupancy[k] > 0) occ[k] = w.edgeOccupancy[k];
  const pend: Record<string, number> = {};
  for (const k in w.edgePending) if (w.edgePending[k].length > 0) pend[k] = w.edgePending[k].length;
  const buf: Record<string, string[]> = {};
  for (const k in w.nodeBufferedEdges) if (w.nodeBufferedEdges[k].length > 0) buf[k] = [...w.nodeBufferedEdges[k]];
  const context = {
    tick: w.tick,
    pendingSeeds: w.pendingSeeds.length,
    nextSeedAtTick: w.pendingSeeds[0]?.atTick,
    edgeOccupancy: occ,
    edgePending: pend,
    nodeBufferedEdges: buf,
  };
  // eslint-disable-next-line no-console
  console.warn("[runner] queue empty but hasPendingWork=true", context);
  reportRunnerError(
    "stepOnce",
    new Error("stuck-pending: queue empty but hasPendingWork=true"),
    context,
  );
}

function emitEvents(rec: FireRecord): void {
  if (!spec || !world) return;
  // Seed-driven arrivals (Input-sourced edges) have no upstream handler
  // to produce an emit notification, so the pulse animation never
  // starts. Notify a paired emit here so seed values are visible — same
  // role the N1' self-pacer used to play incidentally before Input was
  // excluded from concurrent classification.
  if (rec.inEdgeId) {
    const inEdge = findEdge(spec, rec.inEdgeId);
    const srcNode = inEdge ? spec.nodes.find((n) => n.id === inEdge.source) : undefined;
    if (inEdge && srcNode?.type === "Input") {
      notify({
        type: "emit",
        edgeId: inEdge.id,
        fromNodeId: inEdge.source,
        toNodeId: inEdge.target,
        value: rec.inputValue,
        tick: rec.tick,
      });
    }
  }
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

