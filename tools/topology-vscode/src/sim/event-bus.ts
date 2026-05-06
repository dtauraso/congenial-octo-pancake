// Typed event bus that the runner emits onto and AnimatedNode /
// AnimatedEdge subscribe to. Two channels:
//   - RunnerEvent (fire/emit) — per-event payloads.
//   - State — cheap "anything about runner state changed" signal for
//     play/pause buttons and tick labels that don't care about the
//     event itself.

import type { StateValue } from "../schema";
import { reportRunnerError } from "./error-probe";

export type FireEvent = {
  type: "fire";
  nodeId: string;
  inputPort: string;
  inputValue: StateValue;
  // Tick + ord come from the FireRecord so listeners can correlate
  // with simulator history if needed.
  tick: number;
  ord: number;
};

export type EmitEvent = {
  type: "emit";
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  value: StateValue;
  tick: number;
  pulseId: string;
};

let nextPulseSeq = 1;
export function nextPulseId(): string {
  return `p${nextPulseSeq++}`;
}

export type RunnerEvent = FireEvent | EmitEvent;
export type RunnerListener = (e: RunnerEvent) => void;

const listeners: RunnerListener[] = [];
const stateListeners: Array<() => void> = [];

export function subscribe(fn: RunnerListener): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

// Separate channel for "anything about runner state changed" — cheap
// signal for UI affordances (play/pause button, tick label) that don't
// care about per-event payloads.
export function subscribeState(fn: () => void): () => void {
  stateListeners.push(fn);
  return () => {
    const i = stateListeners.indexOf(fn);
    if (i >= 0) stateListeners.splice(i, 1);
  };
}

export function notify(e: RunnerEvent): void {
  const snapshot = listeners.slice();
  for (let i = 0; i < snapshot.length; i++) {
    try {
      snapshot[i](e);
    } catch (err) {
      reportRunnerError("listener", err, { event: e });
    }
  }
}

export function notifyState(): void {
  const snapshot = stateListeners.slice();
  for (let i = 0; i < snapshot.length; i++) {
    try {
      snapshot[i]();
    } catch (err) {
      reportRunnerError("stateListener", err);
    }
  }
}
