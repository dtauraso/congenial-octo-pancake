// Helpers used by load/play paths to (re)create a runner-managed World.

import type { Spec } from "../../schema";
import { initWorld, type World } from "../simulator";

// Wrap initWorld so the runner-managed world always pins slot release
// to anim-end (deferSlotFreeToView). Without this, slots free the
// millisecond a handler runs and the simulator dispatches the next emit
// while the previous pulse is still mid-flight visually — multiple
// pulses accumulate on the edge. Headless tests call initWorld directly
// and keep the default false.
export function initWorldForRun(s: Spec): World {
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
export function hasPendingWork(w: World): boolean {
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
