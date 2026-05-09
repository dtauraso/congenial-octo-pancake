// Wire-based substrate runtime. Dispatches per-shape setup
// (runtime-wires-shapes.ts) based on the matched topology. No
// event-bus, pulse-concurrency, or sim-clock coupling. PulseInstance
// reads performance.now() directly, so the renderer owns its own
// timing.

import type { Spec } from "../schema";
import { buildWires, type WireMap } from "./build-wires";
import { ackWire } from "./wire";
import type { NodeLoop } from "./node-loop";
import { clearAllBuffered } from "./node-streams";
import { setupInputReadGate, setupInputReadGateInhibitor } from "./runtime-wires-shapes";
import { slog } from "./log";

export {
  subscribeNodeTicks, subscribeNodeHeld, subscribeNodeBuffered,
} from "./node-streams";

let _loops: NodeLoop[] = [];
let _wires: WireMap | null = null;
let _running = false;
// Edge id whose receiver-side slot is cleared by an editor button instead
// of by the visual layer's arc-completion auto-ack. Scoped to the
// in0→readGate (chainIn) wire; other wires keep visual pacing.
let _manualAckEdgeId: string | null = null;
let _paused = false;
let _resumeWaiters: Array<() => void> = [];
const _pauseListeners = new Set<(paused: boolean) => void>();

// Pause is a single signal; each subscriber (per-pulse rAF clocks,
// node loops) owns its own freeze. The runtime fans the signal out;
// it does not maintain a shared sim clock.
export function subscribeWiresPause(fn: (paused: boolean) => void): () => void {
  _pauseListeners.add(fn);
  return () => _pauseListeners.delete(fn);
}
let _version = 0;
const _listeners = new Set<() => void>();

export function isWiresRuntimeRunning(): boolean { return _running; }
export function isWiresRuntimePaused(): boolean { return _paused; }

// Toolbar pause: stops issuing new sends. An in-flight pulse finishes
// its arc and acks normally; the input loop then awaits the gate at
// the top of its next iteration.
export function pauseWiresRuntime(): void {
  if (!_running || _paused) return;
  _paused = true;
  for (const fn of _pauseListeners) fn(true);
  bumpVersion();
}

export function resumeWiresRuntime(): void {
  if (!_running || !_paused) return;
  _paused = false;
  const waiters = _resumeWaiters;
  _resumeWaiters = [];
  for (const w of waiters) w();
  for (const fn of _pauseListeners) fn(false);
  bumpVersion();
}

function awaitResumeGate(): Promise<void> {
  if (!_paused) return Promise.resolve();
  return new Promise<void>((resolve) => { _resumeWaiters.push(resolve); });
}

export function getWiresMap(): WireMap | null { return _wires; }
export function getWiresVersion(): number { return _version; }

export function getManualAckEdgeId(): string | null { return _manualAckEdgeId; }

// Clear the receiver-side slot on the manual-ack wire (in0→readGate).
// Returns true if a slot was cleared. No-op when wire is idle or unset.
export function clearManualAckSlot(): boolean {
  if (!_manualAckEdgeId || !_wires) return false;
  const w = _wires.get(_manualAckEdgeId);
  if (!w || w.state !== "inFlight") return false;
  ackWire(w);
  return true;
}

export function subscribeWires(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function bumpVersion(): void {
  _version += 1;
  for (const fn of _listeners) fn();
}

export async function startWiresRuntime(spec: Spec): Promise<void> {
  await stopWiresRuntime();
  const hasInhibitor = spec.nodes.some((n) => n.type === "ChainInhibitor");
  _wires = buildWires(spec);
  const setup = hasInhibitor
    ? setupInputReadGateInhibitor(spec, _wires, awaitResumeGate)
    : setupInputReadGate(spec, _wires, awaitResumeGate);
  _running = true;
  _loops = setup.loops;
  _manualAckEdgeId = setup.manualAckEdgeId ?? null;
  slog("wires-runtime: started", {
    shape: hasInhibitor ? "input+inhibitor->readGate" : "input->readGate",
    edges: [...(_wires?.keys() ?? [])],
  });
  bumpVersion();
}

export async function stopWiresRuntime(): Promise<void> {
  if (!_running && _loops.length === 0 && !_wires) return;
  _running = false;
  // Wake any pause waiters so the input loops unblock and observe
  // stopped=true on their next iteration. Without this, stop() would
  // hang on a paused-and-stopped loop.
  _paused = false;
  const waiters = _resumeWaiters;
  _resumeWaiters = [];
  for (const w of waiters) w();
  const loops = _loops;
  const wires = _wires;
  _loops = [];
  _wires = null;
  _manualAckEdgeId = null;
  // Kick off loop stops first (sets each loop's stopped=true
  // synchronously), THEN ack any in-flight wires so pending sends
  // resolve and the loops see stopped=true on the next iteration.
  const stops = loops.map((l) => l.stop());
  if (wires) for (const w of wires.values()) if (w.state === "inFlight") ackWire(w);
  await Promise.all(stops);
  clearAllBuffered();
  slog("wires-runtime: stopped", {});
  bumpVersion();
}
