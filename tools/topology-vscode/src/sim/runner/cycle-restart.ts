// Continuous-cycle auto-restart. When the queue + pendingSeeds drain
// we don't pause — we wait until both the sim is quiet AND no
// AnimatedEdge is still in flight on screen, then re-seed from spec.
// Gating on activeAnimations (not a wall-clock guess) is what makes
// the "at most one pulse per visible edge" invariant hold across
// cycle boundaries: re-seeding while a pulse is still animating
// emits a second pulse onto the same edge before the first ends.
// User pause cancels the pending re-seed; user play schedules a
// fresh cycle if needed.

import { notifyState } from "../event-bus";
import { reportRunnerError } from "../error-probe";
import type { World } from "../simulator";
import { state } from "./_state";
import { initWorldForRun } from "./_init";
import { resetCadence } from "../../cadence/in0ReadGateAck";

const CYCLE_RESTART_QUIET_MS = 2000;
const CYCLE_RESTART_RECHECK_MS = 250;

export function cancelCycleRestart(): void {
  if (state.cycleRestartTimer !== null) {
    clearTimeout(state.cycleRestartTimer);
    state.cycleRestartTimer = null;
  }
}

export function scheduleCycleRestart(): void {
  if (state.cycleRestartTimer !== null) return;
  state.cycleRestartTimer = setTimeout(tryCycleRestart, CYCLE_RESTART_QUIET_MS);
}

function tryCycleRestart(): void {
  state.cycleRestartTimer = null;
  if (!state.playing || !state.spec || !state.world) return;
  if (state.world.queue.length > 0 || state.world.pendingSeeds.length > 0) return;
  if (state.activeAnimations > 0) {
    state.cycleRestartTimer = setTimeout(tryCycleRestart, CYCLE_RESTART_RECHECK_MS);
    return;
  }
  state.world = initWorldForRun(state.spec);
  state.stuckLogged = false;
  // Cadence is paced by ack callbacks; after a full world re-init the
  // ack channel restarts from the seed too.
  resetCadence();
  // Lazy require to break the step → cycle-restart → step cycle.
  const { stepOnce } = require("./step") as typeof import("./step");
  try { stepOnce(); }
  catch (err) { reportRunnerError("stepOnce", err); }
  notifyState();
}

export function logStuckPendingOnce(w: World): void {
  if (state.stuckLogged) return;
  state.stuckLogged = true;
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
