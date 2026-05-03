// Animation lifecycle. Per-node flashes and state-text are rendered by the
// `AnimatedNode` custom React Flow node type (rf/AnimatedNode.tsx); edge
// pulses are rendered by `AnimatedEdge` (rf/AnimatedEdge.tsx). All WAAPI
// Animations register against the master playback clock so pause/seek work
// uniformly. This module only owns global teardown.

import { clearAnimations, resetPlayback } from "../playback";

export function resetAnimations() {
  clearAnimations();
  resetPlayback();
  // Pulses live as siblings of RF edge paths in older builds — wipe any
  // stragglers in case a previous render leaked them.
  document.querySelectorAll(".rf-edge-pulse").forEach((el) => el.remove());
}
