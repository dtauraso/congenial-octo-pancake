// Owns Pulse lifetimes independent of view layer. Subscribes to the
// event bus's "emit" channel; for each emit, calls
// noteEdgePulseStarted synchronously and arms a renderer-or-timer
// race (pulse-completion) that calls noteEdgePulseEnded when whichever
// signal fires first. The simulator's slot-release machinery
// (deferSlotFreeToView + edgeReleasePending.animEnded) observes
// balanced started/ended pairs regardless of which renderer (or no
// renderer) is subscribed.
//
// Lifecycle clock is per-emitter-node-type via node-animation-rules,
// not a single global. Visual concurrency cap is enforced separately
// in pulse-concurrency (renderer-side); this module always registers
// a balanced lifecycle whether the renderer chose to render or not.
//
// See contracts: C6 (lifecycle balance), C7 (renderer-or-timer race),
// C8 (coalesce keeps lifecycle balanced).

import { subscribe } from "../event-bus";
import { noteEdgePulseStarted, noteEdgePulseEnded } from "./edge-anim";
import { state } from "./_state";
import {
  ruleForNodeType, DEFAULT_RULE, durationForLength, REF_EDGE_LENGTH_PX,
} from "./node-animation-rules";
import { armPulse, _resetPulseCompletion } from "./pulse-completion";
import { _resetPulseConcurrency } from "./pulse-concurrency";

let unsub: (() => void) | null = null;

export function installPulseLifetimes(): void {
  if (unsub) return;
  unsub = subscribe((ev) => {
    if (ev.type !== "emit") return;
    const { edgeId, fromNodeId, pulseId } = ev;
    const srcType = state.spec?.nodes.find((n) => n.id === fromNodeId)?.type;
    const rule = ruleForNodeType(srcType);
    // Initial duration from a reference length; PulseInstance will
    // call extendPulse with the real arc once it mounts. Folded /
    // headless edges keep this default — they have no visual to
    // diverge from.
    const initialMs = durationForLength(rule, REF_EDGE_LENGTH_PX);
    noteEdgePulseStarted(edgeId);
    armPulse(pulseId, edgeId, initialMs, rule.completion, () => {
      noteEdgePulseEnded(edgeId);
    });
  });
}

export function uninstallPulseLifetimes(): void {
  if (!unsub) return;
  unsub();
  unsub = null;
  _resetPulseCompletion();
  _resetPulseConcurrency();
}

// Back-compat export: tests still reference this. With per-type rules
// it's the registry default; node-specific tests should look up via
// ruleForNodeType.
export const PULSE_DEFAULT_DURATION_MS = durationForLength(
  DEFAULT_RULE, REF_EDGE_LENGTH_PX,
);
