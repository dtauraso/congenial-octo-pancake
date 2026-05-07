// Port-plan step 1 substrate runtime. Drives the chan->wire visible
// primitive for the matched 2-node topology by emitting EmitEvents on
// the existing event-bus, so AnimatedEdge renders unchanged.
//
// Channel model: cap=0 (unbuffered). The sender blocks until the
// receiver consumes the previous token. We realise this by waiting
// for AnimatedEdge's pulse-ack event before emitting the next token.
// No timer — the visible traversal IS the back-pressure signal.

import type { Spec, StateValue } from "../schema";
import { readNodeInit } from "../sim/seeds";
import { nextPulseId, notify, notifyState, subscribe } from "../sim/event-bus";
import { _resetPulseConcurrency } from "../sim/runner/pulse-concurrency";
import { reset as resetRunner } from "../sim/runner";
import { state as legacyRunnerState, nowWall } from "../sim/runner/_state";
import { slog } from "./log";

// liveSimTime() in _state.ts only advances while legacyRunnerState.
// playing is true. PulseInstance's rAF math uses getSimTime() which
// reads liveSimTime — so the substrate must drive that flag too,
// otherwise pulses mount but freeze at startArc. We write playing +
// simSegmentStartWall + simAccumMs the same way legacy play/pause do.
function startSimClock(): void {
  legacyRunnerState.simSegmentStartWall = nowWall();
  legacyRunnerState.playing = true;
}
function stopSimClock(): void {
  if (!legacyRunnerState.playing) return;
  legacyRunnerState.simAccumMs += nowWall() - legacyRunnerState.simSegmentStartWall;
  legacyRunnerState.playing = false;
}

let _running = false;
export function isSubstrateRunning(): boolean {
  return _running;
}

// Toolbar play/pause hooks. Pause halts emission of the next token on
// ack receipt AND stops the sim clock so the in-flight pulse freezes
// mid-arc. Resume re-arms emission and restarts the clock.
export function pauseSubstrate(): void {
  if (!_running) return;
  _running = false;
  stopSimClock();
  notifyState();
}
export function resumeSubstrate(): void {
  if (_running || !state.spec) return;
  _running = true;
  startSimClock();
  notifyState();
  emitNext();
}

type SubstrateState = {
  unsub: (() => void) | null;
  spec: Spec | null;
  queue: StateValue[];
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  tick: number;
  edgeReady: boolean;
};

const state: SubstrateState = {
  unsub: null,
  spec: null,
  queue: [],
  edgeId: "",
  fromNodeId: "",
  toNodeId: "",
  tick: 0,
  edgeReady: false,
};

export function loadSubstrate(spec: Spec): void {
  stopSubstrate();
  // The legacy probe machinery (RunnerProbe, _stuck-pulse-probe) can
  // leave stale entries in the visual-slot ledger that block our
  // first emit from claiming a slot. Step 6 deletes all of that;
  // until then we reset on entry so the substrate path starts clean.
  _resetPulseConcurrency();
  // Decommission the legacy runner so its world/seeds/cycle-restart
  // can't compete for the visual slot on this edge. Substrate owns
  // play state from here on via _running.
  resetRunner();
  legacyRunnerState.simAccumMs = 0;
  _running = true;
  startSimClock();
  const input = spec.nodes.find((n) => n.type === "Input")!;
  const edge = spec.edges[0];
  state.spec = spec;
  state.queue = readNodeInit(input.data);
  state.edgeId = edge.id;
  state.fromNodeId = edge.source;
  state.toNodeId = edge.target;
  state.tick = 0;
  state.edgeReady = false;
  slog("loaded", { edgeId: edge.id, queue: state.queue.map(String) });
  notifyState();
  state.unsub = subscribe((ev) => {
    if (ev.type === "edge-ready" && ev.edgeId === state.edgeId) {
      // First (and only first) ready signal kicks off emission. Late
      // re-mounts of AE re-fire edge-ready; ignore once we're running.
      if (!state.edgeReady) {
        state.edgeReady = true;
        emitNext();
      }
      return;
    }
    if (ev.type === "pulse-ack" && ev.edgeId === state.edgeId) {
      emitNext();
    }
  });
}

export function stopSubstrate(): void {
  if (state.unsub) {
    state.unsub();
    state.unsub = null;
  }
  state.spec = null;
  state.edgeReady = false;
  _running = false;
  stopSimClock();
  notifyState();
}

function emitNext(): void {
  if (!_running) return;
  if (state.queue.length === 0) {
    if (state.spec) {
      const input = state.spec.nodes.find((n) => n.type === "Input");
      if (input) state.queue = readNodeInit(input.data);
    }
    if (state.queue.length === 0) return;
  }
  const value = state.queue.shift()!;
  state.tick += 1;
  const ev = {
    type: "emit" as const,
    edgeId: state.edgeId,
    fromNodeId: state.fromNodeId,
    toNodeId: state.toNodeId,
    value,
    tick: state.tick,
    pulseId: nextPulseId(),
  };
  slog("emit", { edgeId: ev.edgeId, value: String(ev.value), pulseId: ev.pulseId, tick: ev.tick });
  notify(ev);
}
