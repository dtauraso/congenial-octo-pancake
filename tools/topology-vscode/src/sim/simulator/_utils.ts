import type { Spec, SeedEvent, StateValue } from "../../schema";
import { scheduleEmission } from "./schedule";
import { type World, indexEdges, orderEvents } from "./types";

// Inject a fresh emission into an existing world's queue from outside the
// step() loop. Used by the runner's concurrent-edge self-pacer to re-fire
// pulse N+1 when pulse N arrives at the target — mutates the passed world
// rather than cloning, since the runner owns the world.
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

export function makeSeed(events: SeedEvent[]): SeedEvent[] {
  return events;
}

// Source-side emissions held back on `edgeId` because the edge was at slot
// capacity. AnimatedEdge reads this to render the parked-at-source dot.
export function getPendingCount(world: World, edgeId: string): number {
  return world.edgePending[edgeId]?.length ?? 0;
}
