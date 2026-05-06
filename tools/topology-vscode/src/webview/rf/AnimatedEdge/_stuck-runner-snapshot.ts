import { state, liveSimTime } from "../../../sim/runner/_state";

export function snapshotRunner(): Record<string, unknown> {
  const w = state.world;
  const head = w?.queue[0];
  const edgePending: Record<string, number> = {};
  const edgeOccupancy: Record<string, number> = {};
  const releasePending: Record<string, { animEnded: boolean; consumed: boolean }> = {};
  const nodeStates: Record<string, unknown> = {};
  if (w) {
    for (const k of Object.keys(w.edgePending)) {
      const n = w.edgePending[k]?.length ?? 0;
      if (n > 0) edgePending[k] = n;
    }
    for (const k of Object.keys(w.edgeOccupancy)) {
      const n = w.edgeOccupancy[k] ?? 0;
      if (n > 0) edgeOccupancy[k] = n;
    }
    for (const k of Object.keys(w.edgeReleasePending)) {
      releasePending[k] = w.edgeReleasePending[k];
    }
    for (const k of Object.keys(w.state)) {
      const s = w.state[k];
      if (s && Object.keys(s).length > 0) nodeStates[k] = s;
    }
  }
  return {
    playing: state.playing,
    simAccumMs: state.simAccumMs,
    simSegmentStartWall: state.simSegmentStartWall,
    nowWall: performance.now(),
    liveSimTime: liveSimTime(),
    stepSimTime: state.stepSimTime,
    activeAnimations: state.activeAnimations,
    queueLen: w?.queue.length ?? null,
    queueHead: head ? {
      toNodeId: head.toNodeId, toPort: head.toPort,
      fromNodeId: head.fromNodeId, fromPort: head.fromPort,
      edgeId: head.edgeId, readyAt: head.readyAt, value: head.value,
    } : null,
    pendingSeeds: w?.pendingSeeds.length ?? null,
    cycle: w?.cycle ?? null,
    tick: w?.tick ?? null,
    cycleRestartTimerSet: state.cycleRestartTimer !== null,
    edgePending, edgeOccupancy, edgeReleasePending: releasePending,
    nodeStates,
    nodeBufferedEdges: w ? { ...w.nodeBufferedEdges } : {},
  };
}
