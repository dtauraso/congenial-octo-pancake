// Read-only probe for runner health. Surfaces the two known stuck
// states the auto-restart loop can land in:
//   - stuck-pending: queue empty + pendingSeeds non-empty + no restart
//   - stuck-anim:    queue + pendingSeeds drained but activeAnimations > 0
//                    so tryCycleRestart keeps polling and never re-seeds
// Used by webview/panels/RunnerProbe.tsx to surface the diagnostic in
// the toolbar without requiring devtools console access.

import { state } from "./_state";

export type RunnerHealth =
  | { kind: "idle" }
  | { kind: "ok"; queue: number; activeAnimations: number }
  | { kind: "stuck-pending"; pendingSeeds: number; nextSeedAtTick?: number }
  | { kind: "stuck-anim"; activeAnimations: number; byEdge: Record<string, number> };

export function probeRunner(): RunnerHealth {
  if (!state.playing || !state.world) return { kind: "idle" };
  const w = state.world;
  if (w.queue.length > 0) {
    return { kind: "ok", queue: w.queue.length, activeAnimations: state.activeAnimations };
  }
  if (w.pendingSeeds.length > 0) {
    return {
      kind: "stuck-pending",
      pendingSeeds: w.pendingSeeds.length,
      nextSeedAtTick: w.pendingSeeds[0]?.atTick,
    };
  }
  if (state.activeAnimations > 0 && state.cycleRestartTimer !== null) {
    return {
      kind: "stuck-anim",
      activeAnimations: state.activeAnimations,
      byEdge: { ...state.activeAnimationsByEdge },
    };
  }
  return { kind: "ok", queue: 0, activeAnimations: state.activeAnimations };
}
