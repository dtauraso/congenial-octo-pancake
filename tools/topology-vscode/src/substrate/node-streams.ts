// Per-node publish/subscribe streams used by the wires runtime.
// Split out of runtime-wires.ts to keep that file under the 200-LOC
// budget. Three independent streams:
//   - ticks: fired after each Input send and ReadGate arrive.
//   - held: latest value held by a receiver node (on every arrive).
//   - buffered: set of inbound ports currently holding an in-flight
//     value (full wires) for a receiver node.

import type { StateValue } from "../schema";

const _tickListeners = new Set<(nodeId: string, ts: number) => void>();
const _heldListeners = new Set<(nodeId: string, value: StateValue) => void>();
const _bufferedListeners = new Set<(nodeId: string, ports: string[]) => void>();
const _bufferedPorts = new Map<string, Set<string>>();

export function subscribeNodeTicks(
  fn: (nodeId: string, ts: number) => void,
): () => void {
  _tickListeners.add(fn);
  return () => _tickListeners.delete(fn);
}

export function publishTick(nodeId: string): void {
  const ts = performance.now();
  for (const fn of _tickListeners) fn(nodeId, ts);
}

export function subscribeNodeHeld(
  fn: (nodeId: string, value: StateValue) => void,
): () => void {
  _heldListeners.add(fn);
  return () => _heldListeners.delete(fn);
}

export function publishHeld(nodeId: string, value: StateValue): void {
  for (const fn of _heldListeners) fn(nodeId, value);
}

export function subscribeNodeBuffered(
  fn: (nodeId: string, ports: string[]) => void,
): () => void {
  _bufferedListeners.add(fn);
  return () => _bufferedListeners.delete(fn);
}

function publishBuffered(nodeId: string): void {
  const ports = Array.from(_bufferedPorts.get(nodeId) ?? []);
  for (const fn of _bufferedListeners) fn(nodeId, ports);
}

export function markBuffered(nodeId: string, port: string): void {
  let s = _bufferedPorts.get(nodeId);
  if (!s) { s = new Set(); _bufferedPorts.set(nodeId, s); }
  s.add(port);
  publishBuffered(nodeId);
}

export function clearBuffered(nodeId: string, port: string): void {
  const s = _bufferedPorts.get(nodeId);
  if (!s) return;
  s.delete(port);
  publishBuffered(nodeId);
}

export function clearAllBuffered(): void {
  _bufferedPorts.clear();
}
