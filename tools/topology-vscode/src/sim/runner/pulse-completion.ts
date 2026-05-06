// Renderer-or-timer race for pulse completion. Each armed pulse has a
// timer (rule.durationMs) AND can be ended early by a renderer signal
// (PulseInstance reaching the end of its arc). Whichever fires first
// invokes onEnd; the loser is a no-op. For folded/headless edges no
// renderer signal arrives and the timer wins by default.
//
// Why this exists: see contracts.md C7. Decoupling the simulator
// clock from the visual clock fixed the fold-livelock (C6) but
// introduced visual divergence on slow arcs. Letting the renderer
// signal completion when it's mounted restores visual fidelity
// without re-coupling correctness to React mount.
//
// "timer"-only completion mode skips the renderer-signal path and
// always ends at durationMs — useful for headless tests or for node
// types whose pulses should not be subject to renderer arc geometry.
//
// armPulse returns a "wasArmed" boolean only as a sanity check;
// double-arming the same pulseId is treated as a no-op (the second
// call's onEnd is dropped).

import type { PulseCompletion } from "./node-animation-rules";

type ArmedPulse = {
  edgeId: string;
  onEnd: () => void;
  timer: ReturnType<typeof setTimeout>;
  ended: boolean;
};

const armed: Map<string, ArmedPulse> = new Map();

export function armPulse(
  pulseId: string,
  edgeId: string,
  durationMs: number,
  _completion: PulseCompletion,
  onEnd: () => void,
): boolean {
  if (armed.has(pulseId)) return false;
  const entry: ArmedPulse = {
    edgeId,
    onEnd,
    ended: false,
    timer: setTimeout(() => endPulse(pulseId), durationMs),
  };
  armed.set(pulseId, entry);
  return true;
}

export function signalRendererComplete(pulseId: string): void {
  endPulse(pulseId);
}

function endPulse(pulseId: string): void {
  const entry = armed.get(pulseId);
  if (!entry || entry.ended) return;
  entry.ended = true;
  clearTimeout(entry.timer);
  armed.delete(pulseId);
  entry.onEnd();
}

export function _resetPulseCompletion(): void {
  for (const e of armed.values()) clearTimeout(e.timer);
  armed.clear();
}
