// Input node-class: owns advancement of pending seeds.
//
// Per the node-owned-state invariant
// (docs/planning/decentralized-backpressure-plan.md), seed cursors are
// advanced only here, in response to the readiness predicate registered
// for each Input id. step.ts consults this module instead of mutating
// pendingSeeds directly.

import { ready } from "./readiness";
import { scheduleEmission } from "./simulator/schedule";
import type { EdgeIndex, World } from "./simulator/types";

// Drain seeds whose atTick has arrived AND whose owning Input is
// ready. Stalled seeds remain in pendingSeeds in their original order.
// Returns true if at least one seed was drained — callers use the
// false return to detect "every due source stalled" and stop the
// runUntil loop.
export function drainReadySeeds(world: World, idx: EdgeIndex): boolean {
  let drained = false;
  const held: typeof world.pendingSeeds = [];
  while (
    world.pendingSeeds.length > 0 &&
    (world.pendingSeeds[0].atTick ?? 0) <= world.tick
  ) {
    const seed = world.pendingSeeds.shift()!;
    if (!ready(seed.nodeId)) {
      held.push(seed);
      continue;
    }
    scheduleEmission(
      world,
      idx,
      seed.nodeId,
      seed.outPort,
      seed.value,
      seed.atTick ?? 0,
      0,
    );
    drained = true;
  }
  if (held.length > 0) world.pendingSeeds.unshift(...held);
  return drained;
}
