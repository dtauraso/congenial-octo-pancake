// Ticked substrate entry. Phase 2: no auto-driver; ticks advance only
// on explicit tickedStep() (wired to the editor's Step button).

import type { Spec, StateValue } from "../../schema";
import { setupShapeATicked } from "./shape-a";
import {
  inboxLen, inboxSnapshot, step, type Runtime,
} from "./runtime";

let _rt: Runtime | null = null;
let _edgeId: string = "";
const _subs = new Set<() => void>();

function _notify() { for (const fn of _subs) fn(); }

export function startTickedShapeA(spec: Spec): void {
  stopTicked();
  const setup = setupShapeATicked(spec);
  _rt = setup.runtime;
  _rt.listeners.add(_notify);
  _edgeId = setup.edgeId;
  _notify();
}

export function stopTicked(): void {
  if (!_rt) return;
  _rt.listeners.clear();
  _rt = null;
  _edgeId = "";
  _notify();
}

export function isTickedActive(): boolean {
  return _rt !== null;
}

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
export function tickedInboxSnapshot(edgeId: string = _edgeId): StateValue[] {
  return _rt ? inboxSnapshot(_rt, edgeId) : [];
}
export function tickedEdgeId(): string {
  return _edgeId;
}
export function subscribeTicked(fn: () => void): () => void {
  _subs.add(fn);
  return () => { _subs.delete(fn); };
}
