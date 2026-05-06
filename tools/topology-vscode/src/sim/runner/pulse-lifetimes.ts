// Owns Pulse lifetimes independent of view layer. Subscribes to the
// event bus's "emit" channel; for each emit, calls
// noteEdgePulseStarted synchronously and schedules noteEdgePulseEnded
// at +PULSE_DEFAULT_DURATION_MS. The simulator's slot-release
// machinery (deferSlotFreeToView + edgeReleasePending.animEnded)
// observes balanced started/ended pairs regardless of which renderer
// (AnimatedEdge / fold-halo / headless) — or no renderer — is
// subscribed to draw the pulse.
//
// Why this exists: previously the bridge lived in PulseInstance's
// useEffect cleanup, which silently broke the moment a view
// abstraction (fold-halo) suppressed the AnimatedEdge for an edge
// the simulator was waiting on. See contract C6 and the May 2026
// pulse-leak-investigation.

import { subscribe } from "../event-bus";
import { noteEdgePulseStarted, noteEdgePulseEnded } from "./edge-anim";

export const PULSE_DEFAULT_DURATION_MS = 2000;

let unsub: (() => void) | null = null;

export function installPulseLifetimes(): void {
  if (unsub) return;
  unsub = subscribe((ev) => {
    if (ev.type !== "emit") return;
    const { edgeId } = ev;
    noteEdgePulseStarted(edgeId);
    setTimeout(() => noteEdgePulseEnded(edgeId), PULSE_DEFAULT_DURATION_MS);
  });
}

export function uninstallPulseLifetimes(): void {
  if (!unsub) return;
  unsub();
  unsub = null;
}
