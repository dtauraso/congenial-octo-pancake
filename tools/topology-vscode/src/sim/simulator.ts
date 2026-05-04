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
  // Edge that delivered the input pulse, when known. Null for seed
  // events and for naked queue entries (edge `data.init` priming) where
  // there's no upstream emission. The runner uses this to wire up the
  // N1' concurrent-edge self-pacer on arrival.
  inEdgeId: string | null;
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
  // Per-edge slot occupancy. An edge with `data.slots: N` (Go's
  // `make(chan, N)`) blocks the source from scheduling another emission
  // once N pulses are in flight. Occupancy includes (a) events in
  // `queue` whose `edgeId` matches and (b) values held in a downstream
  // node's join buffer (see nodeBufferedEdges). Edges without a `slots`
  // override stay unbounded — entries here are absent or unused.
  edgeOccupancy: Record<string, number>;
  // Emissions that couldn't enter the queue because their edge was at
  // capacity. Released FIFO when the slot frees. readyAt is recomputed
  // on release using the current tick + edge delay.
  edgePending: Record<string, SimEvent[]>;
  // For each node, the edges whose pulses currently sit in the node's
  // join buffer (handler returned noEmit). Slot stays occupied on those
  // edges until the node fires, mirroring the latch+ack handshake in
  // the Go topology where the upstream channel can't accept another
  // value until the receiver has cleared its buffer.
  nodeBufferedEdges: Record<string, string[]>;
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
    edgeOccupancy: {},
    edgePending: {},
    nodeBufferedEdges: {},
  };
  const idx = indexEdges(spec);
  // Explicit empty array means "seed nothing on purpose" — only fall
  // back to defaults when seed is undefined.
  const effective = spec.timing?.seed ?? defaultSeed(spec);
  for (const seed of effective) {
    scheduleEmission(
      world,
      idx,
      seed.nodeId,
      seed.outPort,
      seed.value,
      seed.atTick ?? 0,
      0,
    );
  }
  // Edge channel priming: `edge.data.init: [v0, v1, ...]` mirrors Go's
  // `ch <- v0; ch <- v1` pre-loading. Each value becomes a naked event
  // already in flight to the edge's target, ahead of any source fire.
  // This is what lets a fully-running topology re-enter its quiescent
  // cycle from a cold start without an explicit seed list.
  for (const e of spec.edges) {
    const init = readEdgeInit(e.data);
    const slots = readEdgeSlots(e.data);
    for (const v of init) {
      const ev: SimEvent = {
        id: world.nextId++,
        readyAt: 0,
        edgeId: e.id,
        fromNodeId: e.source,
        fromPort: e.sourceHandle,
        toNodeId: e.target,
        toPort: e.targetHandle,
        value: v,
      };
      if (slots !== undefined && (world.edgeOccupancy[e.id] ?? 0) >= slots) {
        const arr = world.edgePending[e.id] ?? [];
        arr.push(ev);
        world.edgePending[e.id] = arr;
      } else {
        world.queue.push(ev);
        world.edgeOccupancy[e.id] = (world.edgeOccupancy[e.id] ?? 0) + 1;
      }
    }
  }
  // Sort so deterministic FIFO is preserved even if seeds list reorders.
  world.queue.sort(orderEvents);
  return world;
}

// Pull `data.init: number[]` off an edge's opaque `data` field. Returns
// [] for any other shape so unrelated `data` payloads (decoration,
// labels) don't accidentally seed events.
// Per-edge traversal delay. Overrides the emission's default delay so a
// single source can fan out to edges of different lengths/latencies.
// Modeled on `data.init`: opaque field, only the well-known shape is
// honored. Negative or non-numeric values fall back to the default.
function readEdgeDelay(data: unknown): number | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = (data as { delay?: unknown }).delay;
  return typeof d === "number" && d >= 0 ? d : undefined;
}

// Per-edge slot capacity. Mirrors `make(chan T, N)` — once N pulses
// are in flight on the edge (queued or held in the receiver's buffer),
// the source blocks. Unset means unbounded (preserves prior behavior
// for edges that haven't opted in).
function readEdgeSlots(data: unknown): number | undefined {
  if (!data || typeof data !== "object") return undefined;
  const s = (data as { slots?: unknown }).slots;
  return typeof s === "number" && s >= 1 ? Math.floor(s) : undefined;
}

function readEdgeInit(data: unknown): StateValue[] {
  if (!data || typeof data !== "object") return [];
  const init = (data as { init?: unknown }).init;
  if (!Array.isArray(init)) return [];
  return init.filter(
    (v): v is StateValue => typeof v === "number" || typeof v === "string",
  );
}

// Fallback when the spec has no `timing.seed`: feed each Input node's
// `data.init: [...]` array (matches Go's `<- ch` priming) onto its
// `out` port, one tick apart. Falls back to a single value=1 pulse if
// no init array is present, so play does something visible on any
// topology with at least one Input.
function defaultSeed(spec: Spec): import("../schema").SeedEvent[] {
  const out: import("../schema").SeedEvent[] = [];
  for (const n of spec.nodes) {
    if (n.type !== "Input") continue;
    const init = readNodeInit(n.data);
    if (init.length === 0) {
      out.push({ nodeId: n.id, outPort: "out", value: 1, atTick: 0 });
      continue;
    }
    init.forEach((v, i) => {
      out.push({ nodeId: n.id, outPort: "out", value: v, atTick: i });
    });
  }
  return out;
}

function readNodeInit(data: unknown): StateValue[] {
  return readEdgeInit(data);
}

function orderEvents(a: SimEvent, b: SimEvent): number {
  if (a.readyAt !== b.readyAt) return a.readyAt - b.readyAt;
  return a.id - b.id;
}

// Emit one (sourceNode, sourcePort, value) onto every outgoing edge,
// scheduled at `baseTick + delay`. Each edge picks its own delay: the
// edge's `data.delay` overrides, otherwise `defaultDelay` is used. No
// edges → silently dropped (modeling Go's dead-end channels like ToAck
// on terminal inhibitors).
function scheduleEmission(
  world: World,
  idx: EdgeIndex,
  fromNodeId: string,
  fromPort: string,
  value: StateValue,
  baseTick: number,
  defaultDelay: number,
): void {
  const edges = idx.get(edgeKey(fromNodeId, fromPort)) ?? [];
  for (const e of edges) {
    const d = readEdgeDelay(e.data) ?? defaultDelay;
    const slots = readEdgeSlots(e.data);
    const ev: SimEvent = {
      id: world.nextId++,
      readyAt: baseTick + d,
      edgeId: e.id,
      fromNodeId,
      fromPort,
      toNodeId: e.target,
      toPort: e.targetHandle,
      value,
    };
    if (slots !== undefined && (world.edgeOccupancy[e.id] ?? 0) >= slots) {
      const arr = world.edgePending[e.id] ?? [];
      arr.push(ev);
      world.edgePending[e.id] = arr;
    } else {
      world.queue.push(ev);
      world.edgeOccupancy[e.id] = (world.edgeOccupancy[e.id] ?? 0) + 1;
    }
  }
}

// Decrement an edge's occupancy and, if pending events were waiting
// for the slot, release one onto the queue with a recomputed readyAt
// (current tick + edge delay) so the wait shows up as a delivery
// happening *now*, not at the originally-scheduled tick.
function freeEdgeSlot(
  world: World,
  edgeId: string,
  spec: Spec,
  nowTick: number,
): void {
  const cur = world.edgeOccupancy[edgeId] ?? 0;
  if (cur > 0) world.edgeOccupancy[edgeId] = cur - 1;
  const pending = world.edgePending[edgeId];
  if (!pending || pending.length === 0) return;
  const released = pending.shift()!;
  if (pending.length === 0) delete world.edgePending[edgeId];
  const e = spec.edges.find((x) => x.id === edgeId);
  const d = e ? (readEdgeDelay(e.data) ?? 1) : 1;
  released.readyAt = nowTick + d;
  released.id = world.nextId++;
  world.queue.push(released);
  world.edgeOccupancy[edgeId] = (world.edgeOccupancy[edgeId] ?? 0) + 1;
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
    edgeOccupancy: { ...world.edgeOccupancy },
    edgePending: { ...world.edgePending },
    nodeBufferedEdges: { ...world.nodeBufferedEdges },
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
    if (head.edgeId !== null) freeEdgeSlot(next, head.edgeId, spec, next.tick);
    next.wasQuiescent = false;
    return step(spec, next);
  }

  const prevState = next.state[head.toNodeId] ?? {};
  const props = resolveProps(spec, head.toNodeId);
  const result = handler(prevState, { port: head.toPort, value: head.value }, props);
  next.state[head.toNodeId] = result.state;

  // Slot bookkeeping. Emissions = fire: free this arrival's edge plus
  // every previously-buffered edge on this node, then drop the buffered
  // list. Empty emissions = the handler stored the input as a buffered
  // value (join half-arrival, latch `in` waiting for `release`); slot
  // stays occupied and we record which edge fed which port so a later
  // fire can free it.
  if (result.emissions.length > 0) {
    if (head.edgeId !== null) freeEdgeSlot(next, head.edgeId, spec, next.tick);
    const buffered = next.nodeBufferedEdges[head.toNodeId];
    if (buffered) {
      for (const eid of buffered) freeEdgeSlot(next, eid, spec, next.tick);
      delete next.nodeBufferedEdges[head.toNodeId];
    }
  } else if (head.edgeId !== null) {
    const arr = next.nodeBufferedEdges[head.toNodeId] ?? [];
    arr.push(head.edgeId);
    next.nodeBufferedEdges[head.toNodeId] = arr;
  }

  for (const em of result.emissions) {
    scheduleEmission(
      next,
      idx,
      head.toNodeId,
      em.port,
      em.value,
      next.tick,
      em.delay ?? 1,
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
      inEdgeId: head.edgeId,
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

// Inject a fresh emission into an existing world's queue from outside
// the step() loop. Used by the runner's concurrent-edge self-pacer to
// re-fire pulse N+1 when pulse N arrives at the target — mutates the
// passed world rather than cloning, since the runner owns the world.
export function enqueueEmission(
  spec: Spec,
  world: World,
  fromNodeId: string,
  fromPort: string,
  value: StateValue,
  atTick: number,
): void {
  const idx = indexEdges(spec);
  scheduleEmission(world, idx, fromNodeId, fromPort, value, atTick, 0);
  world.queue.sort(orderEvents);
}

// Helper for seed authoring + tests.
export function makeSeed(events: SeedEvent[]): SeedEvent[] {
  return events;
}

// Number of source-side emissions held back on `edgeId` because the
// edge was at slot capacity. AnimatedEdge reads this to render the
// parked-at-source dot when an edge is opted into slot capacity and
// has held emissions waiting.
export function getPendingCount(world: World, edgeId: string): number {
  return world.edgePending[edgeId]?.length ?? 0;
}
