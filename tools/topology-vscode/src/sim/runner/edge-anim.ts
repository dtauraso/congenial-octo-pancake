// View → sim bridge for pulse animations. AnimatedEdge calls these on
// mount/unmount of an in-flight pulse so the runner can keep
// activeAnimations in sync (used to gate cycle restarts) and free
// edge slots once the animation actually finishes.

import { noteEdgeAnimEnded } from "../simulator";
import { notifyState } from "../event-bus";
import { reportRunnerError } from "../error-probe";
import { state } from "./_state";
import { stepOnce } from "./step";

export function noteEdgePulseStarted(edgeId: string): void {
  state.activeAnimations++;
  state.activeAnimationsByEdge[edgeId] = (state.activeAnimationsByEdge[edgeId] ?? 0) + 1;
}

export function noteEdgePulseEnded(edgeId: string): void {
  if (state.activeAnimations > 0) state.activeAnimations--;
  const n = state.activeAnimationsByEdge[edgeId] ?? 0;
  if (n > 1) state.activeAnimationsByEdge[edgeId] = n - 1;
  else delete state.activeAnimationsByEdge[edgeId];
  if (!state.spec || !state.world) return;
  if (!state.world.deferSlotFreeToView) return;
  // Slot release is gated on (animEnded AND consumed). This call marks
  // animEnded; if the destination handler has already fired and cleared
  // its buffer for this edge, the slot frees now. Otherwise the slot
  // stays held until the handler fires — mirroring Go's cap-1 channel
  // where the upstream send blocks until the receiver consumes the
  // buffered value into a fire (e.g. ReadGate's chainIn waits for ack).
  noteEdgeAnimEnded(state.world, edgeId, state.spec, state.world.tick);
  if (state.playing) {
    try { stepOnce(); }
    catch (err) { reportRunnerError("listener", err); }
  }
  notifyState();
}
