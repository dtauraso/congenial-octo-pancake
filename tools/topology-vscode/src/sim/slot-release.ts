// Per-edge slot release bookkeeping under deferSlotFreeToView.
//
// Under defer mode, an in-flight edge's slot releases only when BOTH
// (animEnded AND consumed) are true. animEnded is flipped by the
// AnimatedEdge unmount path; consumed is flipped by simulator.step
// when the destination handler fires with this edge's value cleared
// from its buffer. Mirrors Go's cap-1 channel + HasValue semantics.
//
// freeEdgeSlot lives here too — it's the underlying slot-decrement +
// pending-event-release primitive that both modes call once they've
// decided release is appropriate.

import type { Spec } from "../schema";
import type { World, SimEvent } from "./simulator";
import { readEdgeDelay } from "./seeds";

export function ensureReleaseEntry(world: World, edgeId: string): void {
  if (!world.edgeReleasePending[edgeId]) {
    world.edgeReleasePending[edgeId] = { animEnded: false, consumed: false };
  }
}

function tryReleaseEdge(
  world: World,
  edgeId: string,
  spec: Spec,
  nowTick: number,
): void {
  const e = world.edgeReleasePending[edgeId];
  if (!e) return;
  if (!e.animEnded || !e.consumed) return;
  delete world.edgeReleasePending[edgeId];
  freeEdgeSlot(world, edgeId, spec, nowTick);
}

// Mark an edge's in-flight pulse as having finished its visible
// animation. If the destination handler has also already consumed it,
// frees the slot now; otherwise the slot stays held until consumption.
export function noteEdgeAnimEnded(
  world: World,
  edgeId: string,
  spec: Spec,
  nowTick: number,
): void {
  ensureReleaseEntry(world, edgeId);
  world.edgeReleasePending[edgeId].animEnded = true;
  tryReleaseEdge(world, edgeId, spec, nowTick);
}

// Mark an edge's in-flight pulse as having been consumed by the
// destination handler (handler fired and cleared this edge's port from
// its buffer). If the visible animation has also already ended, frees
// the slot now; otherwise the slot stays held until anim-end.
export function noteEdgeConsumed(
  world: World,
  edgeId: string,
  spec: Spec,
  nowTick: number,
): void {
  ensureReleaseEntry(world, edgeId);
  world.edgeReleasePending[edgeId].consumed = true;
  tryReleaseEdge(world, edgeId, spec, nowTick);
}

// Decrement an edge's occupancy and, if pending events were waiting
// for the slot, release one onto the queue with a recomputed readyAt
// (current tick + edge delay) so the wait shows up as a delivery
// happening *now*, not at the originally-scheduled tick.
export function freeEdgeSlot(
  world: World,
  edgeId: string,
  spec: Spec,
  nowTick: number,
): void {
  const cur = world.edgeOccupancy[edgeId] ?? 0;
  if (cur > 0) world.edgeOccupancy[edgeId] = cur - 1;
  const pending = world.edgePending[edgeId];
  if (!pending || pending.length === 0) return;
  const released: SimEvent = pending.shift()!;
  if (pending.length === 0) delete world.edgePending[edgeId];
  const e = spec.edges.find((x) => x.id === edgeId);
  const d = e ? (readEdgeDelay(e.data) ?? 1) : 1;
  released.readyAt = nowTick + d;
  released.id = world.nextId++;
  world.queue.push(released);
  world.edgeOccupancy[edgeId] = (world.edgeOccupancy[edgeId] ?? 0) + 1;
  if (world.deferSlotFreeToView && !released.fromInit) {
    ensureReleaseEntry(world, edgeId);
  }
}
