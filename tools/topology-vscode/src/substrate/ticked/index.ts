// Ticked substrate entry. One module-level runtime; mirrors the
// ergonomics of step/runtime.ts so runtime-wires can dispatch cleanly.

import type { Spec } from "../../schema";
import { setupShapeATicked } from "./shape-a";
import { inboxLen, startDriver, step, stopRuntime, type Runtime } from "./runtime";

let _rt: Runtime | null = null;
let _edgeId: string = "";

const DEFAULT_TICK_MS = 600;

export function startTickedShapeA(spec: Spec, intervalMs = DEFAULT_TICK_MS): void {
  stopTicked();
  const setup = setupShapeATicked(spec);
  _rt = setup.runtime;
  _edgeId = setup.edgeId;
  if (intervalMs > 0) startDriver(_rt, intervalMs);
}

export function stopTicked(): void {
  if (!_rt) return;
  stopRuntime(_rt);
  _rt = null;
  _edgeId = "";
}

export function isTickedActive(): boolean {
  return _rt !== null;
}

// Test/inspection helpers.
export function tickedStep(): number {
  if (!_rt) return -1;
  return step(_rt);
}
export function tickedTickCount(): number {
  return _rt?.tick ?? 0;
}
export function tickedInboxLen(edgeId: string = _edgeId): number {
  return _rt ? inboxLen(_rt, edgeId) : 0;
}
export function tickedEdgeId(): string {
  return _edgeId;
}
