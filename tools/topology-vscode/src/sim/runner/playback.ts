// Wall-clock playback: play/pause/isPlaying and the interval tick body.

import { notifyState } from "../event-bus";
import { reportRunnerError } from "../error-probe";
import { state, nowWall } from "./_state";
import { initWorldForRun, hasPendingWork } from "./_init";
import { cancelCycleRestart, scheduleCycleRestart, logStuckPendingOnce } from "./cycle-restart";
import { stepOnce } from "./step";
import { pauseAllPulseTimers, resumeAllPulseTimers } from "./pulse-completion";

export function rearmInterval(): void {
  if (state.intervalId) clearInterval(state.intervalId);
  state.intervalId = setInterval(tick, state.tickMs);
}

export function play(): void {
  if (state.playing || !state.spec) return;
  cancelCycleRestart();
  // If we're at rest (queue drained from a previous run, or never
  // started), re-seed by resetting. Lets the play button behave as
  // "restart from seed" when nothing's queued, instead of silently
  // pausing on the first interval tick.
  if (state.replayEvents) {
    if (state.replayIndex >= state.replayEvents.length) {
      state.replayIndex = 0;
      state.world = initWorldForRun(state.spec);
      if (state.world) state.world.queue = [];
    }
  } else if (!state.world || !hasPendingWork(state.world)) {
    state.world = initWorldForRun(state.spec);
    state.stuckLogged = false;
  }
  state.playing = true;
  state.simSegmentStartWall = nowWall();
  resumeAllPulseTimers();
  // Step immediately so the user sees the first event without a 200ms
  // dead beat after pressing play. Wrap so a thrown handler doesn't
  // leave us in playing=true with no interval set (the "stuck pause"
  // UI symptom).
  try {
    stepOnce();
  } catch (err) {
    reportRunnerError("stepOnce", err);
    state.playing = false;
    notifyState();
    return;
  }
  if (state.playing) state.intervalId = setInterval(tick, state.tickMs);
  notifyState();
}

export function pause(): void {
  if (!state.playing) return;
  state.simAccumMs += nowWall() - state.simSegmentStartWall;
  state.playing = false;
  pauseAllPulseTimers();
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = 0;
  }
  cancelCycleRestart();
  notifyState();
}

export function isPlaying(): boolean {
  return state.playing;
}

function tick(): void {
  if (!state.spec || !state.world) return;
  if (state.replayEvents) {
    if (state.replayIndex >= state.replayEvents.length) {
      pause();
      return;
    }
    stepOnce();
    return;
  }
  if (state.world.queue.length === 0) {
    if (state.world.pendingSeeds.length === 0) {
      scheduleCycleRestart();
    } else {
      logStuckPendingOnce(state.world);
    }
    return;
  }
  stepOnce();
}
