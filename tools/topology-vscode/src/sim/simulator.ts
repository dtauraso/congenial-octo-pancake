// Pure event-stepping simulator for Phase 5.5. Given (spec, world),
// `step(world)` pops the oldest in-flight event whose delay has expired,
// runs the receiver's handler, schedules emissions, and returns the new
// world. Independent of the renderer — the runner (Chunk C) wraps this
// in a wall-clock interval and emits events to the EventBus.
//
// Determinism: events are tagged with a monotonically-increasing arrival
// id at schedule time. When multiple events are ready in the same tick,
// the lowest arrival id wins. Two simulators given identical specs +
// identical seed events produce identical event sequences.

import type {
  Spec,
  SeedEvent,
  StateValue,
  HandlerState,
  Edge,
} from "../schema";
import { getHandler } from "./handlers";
import { NODE_TYPES } from "../schema";

export type SimEvent = {
  // Monotonically-increasing schedule order. Tie-break for ready events.
  id: number;
  // Tick at which this event becomes deliverable.
  readyAt: number;
  // Receiving node + input port. For seed events the receiver is
  // resolved by routing the seed's source emission through edges.
  edgeId: string | null;
  fromNodeId: string;
  fromPort: string;
  toNodeId: string;
  toPort: string;
  value: StateValue;
};

export type FireRecord = {
  ord: number;
  tick: number;
  cycle: number;
  nodeId: string;
  inputPort: string;
  inputValue: StateValue;
  emissions: { port: string; value: StateValue }[];
};

export type World = {
  tick: number;
  cycle: number;
  // Was the queue empty at the *end* of the previous step? Tracked so
  // the (ii-a) quiescent-input rule increments cycle exactly once on
  // each drain rather than every tick the queue stays empty.
  wasQuiescent: boolean;
  state: Record<string, HandlerState>;
  queue: SimEvent[];
  history: FireRecord[];
  nextId: number;
  nextOrd: number;
};

// Edges keyed by (sourceNode, sourcePort) for fast lookup at emit time.
type EdgeIndex = Map<string, Edge[]>;

function edgeKey(nodeId: string, port: string): string {
  return `${nodeId}${port}`;
}

function indexEdges(spec: Spec): EdgeIndex {
  const idx: EdgeIndex = new Map();
  for (const e of spec.edges) {
    const k = edgeKey(e.source, e.sourceHandle);
    const arr = idx.get(k);
    if (arr) arr.push(e);
    else idx.set(k, [e]);
  }
  return idx;
}

// Resolve per-instance props by merging registry defaults under the
// node's overrides. Defaults come from NODE_TYPES[type].defaultProps;
// the spec only stores the deltas.
function resolveProps(spec: Spec, nodeId: string): Record<string, StateValue> {
  const node = spec.nodes.find((n) => n.id === nodeId);
  if (!node) return {};
  const def = NODE_TYPES[node.type];
  return { ...(def?.defaultProps ?? {}), ...(node.props ?? {}) };
}

export function initWorld(spec: Spec): World {
  const world: World = {
    tick: 0,
    cycle: 0,
    wasQuiescent: true,
    state: {},
    queue: [],
    history: [],
    nextId: 0,
    nextOrd: 0,
  };
  const idx = indexEdges(spec);
  for (const seed of spec.timing?.seed ?? []) {
    scheduleEmission(
      world,
      idx,
      seed.nodeId,
      seed.outPort,
      seed.value,
      seed.atTick ?? 0,
    );
  }
  // Sort so deterministic FIFO is preserved even if seeds list reorders.
  world.queue.sort(orderEvents);
  return world;
}

function orderEvents(a: SimEvent, b: SimEvent): number {
  if (a.readyAt !== b.readyAt) return a.readyAt - b.readyAt;
  return a.id - b.id;
}

// Emit one (sourceNode, sourcePort, value) onto every outgoing edge,
// scheduled at `at`. No edges → silently dropped (modeling Go's
// dead-end channels like ToAck on terminal inhibitors).
function scheduleEmission(
  world: World,
  idx: EdgeIndex,
  fromNodeId: string,
  fromPort: string,
  value: StateValue,
  at: number,
): void {
  const edges = idx.get(edgeKey(fromNodeId, fromPort)) ?? [];
  for (const e of edges) {
    world.queue.push({
      id: world.nextId++,
      readyAt: at,
      edgeId: e.id,
      fromNodeId,
      fromPort,
      toNodeId: e.target,
      toPort: e.targetHandle,
      value,
    });
  }
}

// Pop the next ready event, run its handler, schedule resulting
// emissions. Returns the new world. If no event is ready, advances tick
// to the next ready event (or returns the world unchanged when fully
// quiescent — useful for runner pause/idle detection).
export function step(spec: Spec, world: World): World {
  const idx = indexEdges(spec);
  const next: World = {
    ...world,
    state: { ...world.state },
    queue: [...world.queue],
    history: world.history,
  };

  if (next.queue.length === 0) {
    // Already quiescent before this call. Nothing to do.
    next.wasQuiescent = true;
    return next;
  }

  // Advance virtual tick to the next ready event.
  const head = next.queue[0];
  if (head.readyAt > next.tick) next.tick = head.readyAt;
  next.queue.shift();

  const handler = getHandler(
    spec.nodes.find((n) => n.id === head.toNodeId)?.type ?? "",
    head.toPort,
  );
  if (!handler) {
    // No handler — silently absorb (e.g. dead-end ack on terminal
    // ChainInhibitor). Recurse to make progress on this tick.
    next.wasQuiescent = false;
    return step(spec, next);
  }

  const prevState = next.state[head.toNodeId] ?? {};
  const props = resolveProps(spec, head.toNodeId);
  const result = handler(prevState, { port: head.toPort, value: head.value }, props);
  next.state[head.toNodeId] = result.state;

  for (const em of result.emissions) {
    scheduleEmission(
      next,
      idx,
      head.toNodeId,
      em.port,
      em.value,
      next.tick + (em.delay ?? 1),
    );
  }
  next.queue.sort(orderEvents);

  next.history = [
    ...next.history,
    {
      ord: next.nextOrd++,
      tick: next.tick,
      cycle: next.cycle,
      nodeId: head.toNodeId,
      inputPort: head.toPort,
      inputValue: head.value,
      emissions: result.emissions.map((e) => ({ port: e.port, value: e.value })),
    },
  ];

  // Cycle counter:
  //   (ii-b) anchor-fire — increment each time the named node fires.
  //   (ii-a) quiescent-input — increment when this step drained the
  //          queue (no anchor configured).
  if (spec.cycleAnchor) {
    if (head.toNodeId === spec.cycleAnchor) next.cycle += 1;
  } else if (next.queue.length === 0) {
    next.cycle += 1;
  }
  next.wasQuiescent = next.queue.length === 0;
  return next;
}

// Drive the simulator until `pred(world)` returns true OR the queue
// drains and `pred` still hasn't fired. Returns the world at the
// stopping point. Used by replayTo and by N2 step-debugger when the
// user clicks "step until next fire on this node".
export function runUntil(
  spec: Spec,
  world: World,
  pred: (w: World) => boolean,
  maxSteps = 100_000,
): World {
  let cur = world;
  for (let i = 0; i < maxSteps; i++) {
    if (pred(cur)) return cur;
    if (cur.queue.length === 0) return cur;
    cur = step(spec, cur);
  }
  throw new Error(
    `simulator.runUntil exceeded maxSteps=${maxSteps}; check for infinite loops`,
  );
}

// F1 deterministic replay: re-run cycle 0 → targetCycle silently from a
// fresh world. No snapshot storage; cheap because handlers are pure.
// Bookmarks (Chunk D) call this to fast-forward to a saved cycle.
export function replayTo(spec: Spec, targetCycle: number): World {
  return runUntil(spec, initWorld(spec), (w) => w.cycle >= targetCycle);
}

// Convenience for tests / N1' detection: run to first quiescence.
export function runToQuiescent(spec: Spec, world: World = initWorld(spec)): World {
  return runUntil(spec, world, (w) => w.queue.length === 0 && w.tick > 0);
}

// Re-export handler registry through the sim namespace so callers can
// import `from "./sim"` without reaching back into schema.
export { HANDLERS, getHandler } from "./handlers";

// Helper for seed authoring + tests.
export function makeSeed(events: SeedEvent[]): SeedEvent[] {
  return events;
}
