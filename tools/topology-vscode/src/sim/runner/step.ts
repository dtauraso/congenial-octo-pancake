// stepOnce + step-debugger entry points (stepToNode, jumpTo).

import { step, replayTo } from "../simulator";
import { notifyState } from "../event-bus";
import { state, liveSimTime } from "./_state";
import { scheduleCycleRestart } from "./cycle-restart";
import { replayStepOnce } from "./replay";
import { emitEvents } from "./emit";
import { pause } from "./playback";

export function stepOnce(): void {
  if (!state.spec || !state.world) return;
  if (state.replayEvents) {
    replayStepOnce();
    return;
  }
  if (state.world.queue.length === 0) {
    // Queue empty + no future seeds = end of a cycle. Don't pause —
    // schedule a debounced re-seed so the animation runs continuously.
    // The quiet window lets in-flight visible pulses finish before the
    // next cycle starts. User pause() cancels the timer.
    if (state.world.pendingSeeds.length === 0) {
      scheduleCycleRestart();
    }
    return;
  }
  const before = state.world.history.length;
  state.stepSimTime = liveSimTime();
  try {
    state.world = step(state.spec, state.world);
    const fresh = state.world.history.slice(before);
    for (const rec of fresh) emitEvents(rec);
  } finally {
    state.stepSimTime = null;
  }
  notifyState();
}

// N2 step-debugger: drive the simulator until the next event arrives at
// `nodeId`, then stop. Lets the user single-step a particular node
// without globally pausing/resuming. If no future event reaches that
// node before the queue drains, returns silently.
export function stepToNode(nodeId: string): void {
  if (!state.spec || !state.world) return;
  pause();
  const target = state.world.history.length;
  for (let i = 0; i < 5000; i++) {
    if (!state.world || state.world.queue.length === 0) break;
    stepOnce();
    if (!state.world) break;
    const fresh = state.world.history.slice(target);
    if (fresh.some((r) => r.nodeId === nodeId)) break;
  }
}

// Bookmark resume: F1 deterministic replay to `cycle`, then leave the
// runner paused so the step-debugger can take over. `startNodeId` is
// recorded for the UI but doesn't change cycle math — bookmarks are
// just (cycle, focus-node) pairs.
export function jumpTo(cycle: number, _startNodeId: string): void {
  if (!state.spec) return;
  pause();
  state.world = replayTo(state.spec, cycle);
  notifyState();
}
