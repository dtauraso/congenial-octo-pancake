// Public instrumentation hooks called from animation code. Each
// captures the (wall, sim, tick) timestamp triple at the call site,
// pushes a probe entry, and dispatches an AnimEvent for in-app
// listeners.

import { getSimTime, getWorld } from "../../../sim/runner";
import { dispatchAnim } from "./anim-events";
import { probeEnabled, push } from "./ring-buffer";

function currentSimTick(): number {
  const w = getWorld();
  return w ? w.tick : -1;
}

export function noteAnimStart(
  edgeId: string,
  fromNodeId: string,
  toNodeId: string,
): void {
  const wallTs = Date.now();
  const simTime = getSimTime();
  if (probeEnabled()) {
    push({
      wallTs, simTime, simTick: currentSimTick(),
      kind: "anim-start", edgeId, fromNodeId, toNodeId,
    });
  }
  dispatchAnim({ kind: "anim-start", edgeId, fromNodeId, toNodeId, simTime, wallTs });
}

export function noteAnimEnd(
  edgeId: string,
  fromNodeId: string,
  toNodeId: string,
  completed: boolean,
  arcTraveled: number,
): void {
  const wallTs = Date.now();
  const simTime = getSimTime();
  if (probeEnabled()) {
    push({
      wallTs, simTime, simTick: currentSimTick(),
      kind: "anim-end", edgeId, fromNodeId, toNodeId, completed, arcTraveled,
    });
  }
  dispatchAnim({
    kind: "anim-end",
    edgeId, fromNodeId, toNodeId, completed, arcTraveled, simTime, wallTs,
  });
}

export function noteAnimRerun(
  edgeId: string,
  prevArc: number,
  newStartArc: number,
  newSvgArc: number,
  newRemainingMs: number,
): void {
  if (!probeEnabled()) return;
  push({
    wallTs: Date.now(),
    simTime: getSimTime(),
    simTick: currentSimTick(),
    kind: "anim-rerun",
    edgeId, prevArc, newStartArc, newSvgArc, newRemainingMs,
  });
}

export function noteMarker(note: string): void {
  if (!probeEnabled()) return;
  push({
    wallTs: Date.now(),
    simTime: getSimTime(),
    simTick: currentSimTick(),
    kind: "marker",
    note,
  });
}
