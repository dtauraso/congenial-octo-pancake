// Per-edge visual-render concurrency cap. Tracks how many pulses are
// currently "claimed" for visual rendering on each edge. The renderer
// (AnimatedEdge) calls tryClaimVisualSlot before mounting a
// PulseInstance; if false, it skips the visual but the simulator-side
// lifecycle (pulse-lifetimes) still fires balanced started/ended so
// slot-release accounting in the simulator is unaffected. See
// contract C8.
//
// Why a separate ledger from state.activeAnimationsByEdge: the latter
// is the simulator's correctness ledger and must always balance. This
// ledger is purely visual — it gates how many <PulseInstance>s exist,
// preventing the frame-stall failure mode where N concurrent
// PulseInstances each run per-frame geometry math.

const visualActive: Map<string, number> = new Map();

export function tryClaimVisualSlot(edgeId: string, cap: number): boolean {
  const current = visualActive.get(edgeId) ?? 0;
  if (current >= cap) return false;
  visualActive.set(edgeId, current + 1);
  return true;
}

export function releaseVisualSlot(edgeId: string): void {
  const current = visualActive.get(edgeId) ?? 0;
  if (current <= 1) visualActive.delete(edgeId);
  else visualActive.set(edgeId, current - 1);
}

export function visualSlotCount(edgeId: string): number {
  return visualActive.get(edgeId) ?? 0;
}

export function _resetPulseConcurrency(): void {
  visualActive.clear();
}
