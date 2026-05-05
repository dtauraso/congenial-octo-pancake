import type { SeedEvent, StateValue, HandlerState, Edge } from "../../schema";

export type SimEvent = {
  // Monotonically-increasing schedule order. Tie-break for ready events.
  id: number;
  // Tick at which this event becomes deliverable.
  readyAt: number;
  edgeId: string | null;
  fromNodeId: string;
  fromPort: string;
  toNodeId: string;
  toPort: string;
  value: StateValue;
  // Edge `data.init` priming. Init values are "already in flight" from
  // before time started — they hold an edge slot during queueing/fire
  // (slot=1 backpressure still applies to subsequent senders), but no
  // visible pulse is animated for them. Under deferSlotFreeToView the
  // normal release path is the view's anim-end callback; an init event
  // has no anim-end, so step() must free its slot at fire time
  // regardless of defer or the slot leaks forever.
  fromInit?: boolean;
};

export type FireRecord = {
  ord: number;
  tick: number;
  cycle: number;
  nodeId: string;
  inputPort: string;
  inputValue: StateValue;
  // Edge that delivered the input pulse, when known. Null for seed events
  // and for naked queue entries (edge `data.init` priming).
  inEdgeId: string | null;
  emissions: { port: string; value: StateValue }[];
};

export type World = {
  tick: number;
  cycle: number;
  // Was the queue empty at the *end* of the previous step? Tracked so the
  // (ii-a) quiescent-input rule increments cycle exactly once per drain.
  wasQuiescent: boolean;
  state: Record<string, HandlerState>;
  queue: SimEvent[];
  history: FireRecord[];
  nextId: number;
  nextOrd: number;
  // Per-edge slot occupancy. Edge with `data.slots: N` (Go's `make(chan,
  // N)`) blocks the source from scheduling another emission once N pulses
  // are in flight. Includes (a) events in `queue` whose `edgeId` matches
  // and (b) values held in a downstream node's join buffer.
  edgeOccupancy: Record<string, number>;
  // Emissions that couldn't enter the queue because their edge was at
  // capacity. Released FIFO when the slot frees.
  edgePending: Record<string, SimEvent[]>;
  // For each node, the edges whose pulses currently sit in the node's
  // join buffer (handler returned noEmit). Slot stays occupied on those
  // edges until the node fires, mirroring the latch+ack handshake in Go.
  nodeBufferedEdges: Record<string, string[]>;
  // Seeds whose atTick is in the future. Held outside the main queue so
  // their slot acquisition is deferred until their atTick arrives.
  pendingSeeds: SeedEvent[];
  // When true, `step` does NOT free edge slots when a handler fires. The
  // view (AnimatedEdge) calls `freeEdgeSlot` on anim-end instead.
  deferSlotFreeToView: boolean;
  // Per-edge release gate under deferSlotFreeToView. Slot releases only
  // when BOTH animEnded (anim finished) AND consumed (handler cleared the
  // value from its buffer). Mirrors Go's cap-1 channel + HasValue
  // semantics: upstream `ch <- v` blocks until receiver consumed v.
  edgeReleasePending: Record<string, { animEnded: boolean; consumed: boolean }>;
};

export type EdgeIndex = Map<string, Edge[]>;

export function edgeKey(nodeId: string, port: string): string {
  return `${nodeId}${port}`;
}

export function indexEdges(spec: { edges: Edge[] }): EdgeIndex {
  const idx: EdgeIndex = new Map();
  for (const e of spec.edges) {
    const k = edgeKey(e.source, e.sourceHandle);
    const arr = idx.get(k);
    if (arr) arr.push(e);
    else idx.set(k, [e]);
  }
  return idx;
}

export function orderEvents(a: SimEvent, b: SimEvent): number {
  if (a.readyAt !== b.readyAt) return a.readyAt - b.readyAt;
  return a.id - b.id;
}
