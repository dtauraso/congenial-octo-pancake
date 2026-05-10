// Alt-substrate dispatch helpers (ticked + step). Extracted from
// runtime-wires.ts to keep that file under the LOC budget. Each
// helper returns true when it consumed the call so the host knows
// to early-return.

import type { Spec } from "../schema";
import type { WireMap } from "./build-wires";
import type { ManualAckEdge, TriggerSlot } from "./runtime-wires-shapes";
import type { NodeLoop } from "./node-loop";
import { startStepShapeA, stopStepRuntime, isStepRuntimeActive } from "./step/runtime";
import { startTickedShapeA, stopTicked, isTickedActive } from "./ticked";
import { clearAllBuffered } from "./node-streams";
import { slog } from "./log";

export type AltHostState = {
  setRunning: (v: boolean) => void;
  setWires: (w: WireMap | null) => void;
  setLoops: (l: NodeLoop[]) => void;
  setManualAck: (edges: ManualAckEdge[]) => void;
  setSelfAcksAll: (v: boolean) => void;
  setTriggerSlots: (s: TriggerSlot[]) => void;
};

function resetAltState(host: AltHostState, selfAcksAll: boolean): void {
  host.setRunning(true);
  host.setWires(null);
  host.setLoops([]);
  host.setManualAck([]);
  host.setSelfAcksAll(selfAcksAll);
  host.setTriggerSlots([]);
}

export function tryStartAltSubstrate(
  spec: Spec, shape: string | null, useStepShapeA: boolean, host: AltHostState,
): boolean {
  if (spec.runtime === "ticked" && shape === "input->readGate") {
    startTickedShapeA(spec);
    resetAltState(host, false);
    slog("wires-runtime: started (ticked substrate)", { shape });
    return true;
  }
  if (useStepShapeA && shape === "input->readGate") {
    const setup = startStepShapeA(spec);
    host.setWires(setup.wires);
    host.setRunning(true);
    host.setLoops([]);
    host.setManualAck([]);
    host.setSelfAcksAll(true);
    host.setTriggerSlots([]);
    slog("wires-runtime: started (step substrate)", {
      shape: "input->readGate", edges: [...setup.wires.keys()],
    });
    return true;
  }
  return false;
}

export function tryStopAltSubstrate(host: AltHostState): boolean {
  if (isTickedActive()) {
    stopTicked();
    host.setRunning(false);
    host.setWires(null);
    clearAllBuffered();
    slog("wires-runtime: stopped (ticked substrate)", {});
    return true;
  }
  if (isStepRuntimeActive()) {
    stopStepRuntime();
    host.setRunning(false);
    host.setWires(null);
    host.setSelfAcksAll(false);
    clearAllBuffered();
    slog("wires-runtime: stopped (step substrate)", {});
    return true;
  }
  return false;
}
