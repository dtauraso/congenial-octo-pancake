// Step-substrate runtime adapter. Holds the driver + StepNode list +
// WireMap for the active topology, and exposes start/stop/pause/resume
// hooks that mirror the await runtime's semantics. The await runtime
// in runtime-wires.ts delegates here when the step-substrate flag is
// on for a matched shape.

import type { Spec } from "../../schema";
import type { WireMap } from "../build-wires";
import { ackWire } from "../wire";
import { clearAllBuffered, resetTotalTicks } from "../node-streams";
import { setupStepShapeA } from "./shape-a-setup";
import { makeDriver, type Driver } from "./driver";

const FRAME_MS = 100; // human-visible cadence; tune later

let _driver: Driver | null = null;
let _wires: WireMap | null = null;
let _paused = false;

export function startStepShapeA(spec: Spec): { wires: WireMap; selfAcksAll: true } {
  stopStepRuntime();
  const setup = setupStepShapeA(spec);
  _wires = setup.wires;
  _driver = makeDriver(setup.nodes, FRAME_MS);
  resetTotalTicks();
  _driver.start();
  _paused = false;
  return { wires: setup.wires, selfAcksAll: true };
}

export function stopStepRuntime(): void {
  if (_driver) { _driver.stop(); _driver = null; }
  if (_wires) {
    for (const w of _wires.values()) if (w.state === "inFlight") ackWire(w);
    _wires = null;
  }
  _paused = false;
  clearAllBuffered();
}

export function pauseStepRuntime(): void {
  if (!_driver || _paused) return;
  _driver.stop();
  _paused = true;
}

export function resumeStepRuntime(): void {
  if (!_driver || !_paused) return;
  _driver.start();
  _paused = false;
}

export function isStepRuntimeActive(): boolean { return _driver !== null; }
