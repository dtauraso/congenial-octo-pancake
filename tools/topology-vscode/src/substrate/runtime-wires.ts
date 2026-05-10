// Wire-based substrate runtime. Dispatches per-shape setup
// (runtime-wires-shapes.ts) based on the matched topology. No
// event-bus, pulse-concurrency, or sim-clock coupling. PulseInstance
// reads performance.now() directly, so the renderer owns its own
// timing.

import type { Spec } from "../schema";
import { buildWires, type WireMap } from "./build-wires";
import { ackWire } from "./wire";
import type { NodeLoop } from "./node-loop";
import { clearAllBuffered, resetTotalTicks } from "./node-streams";
import { stopAwaitRuntime } from "./runtime-wires-stop";
import {
  setupInputReadGate, setupInputReadGateInhibitor,
  setupInputReadGateInhibitorWithI0,
  type ManualAckEdge, type TriggerSlot,
} from "./runtime-wires-shapes";
import { setupInputReadGateInhibitorCycle } from "./runtime-wires-shape-d";
import { setupInputReadGatePair, stopInputReadGatePair } from "./runtime-wires-pair";
import { matchSubstrateShape } from "./match";
import { slog } from "./log";
import { pauseStepRuntime, resumeStepRuntime, isStepRuntimeActive } from "./step/runtime";
import { tryStartAltSubstrate, tryStopAltSubstrate, type AltHostState } from "./runtime-wires-alts";

// Shape A routing. Pair > step > legacy. See handoff-next-task.md.
const USE_PAIR_SUBSTRATE_SHAPE_A = true;
const USE_STEP_SUBSTRATE_SHAPE_A = false;

export {
  subscribeNodeTicks, subscribeNodeHeld, subscribeNodeBuffered,
  subscribeTotalTicks, getTotalTicks,
} from "./node-streams";

let _loops: NodeLoop[] = [];
let _wires: WireMap | null = null;
let _running = false;
// Edges acked by editor button instead of arc-completion auto-ack.
let _manualAckEdges: ManualAckEdge[] = [];
const _manualAckSet = new Set<string>();
const _selfAckSet = new Set<string>();
let _selfAcksAll = false;
let _triggerSlots: TriggerSlot[] = [];
let _paused = false;
let _resumeWaiters: Array<() => void> = [];
const _pauseListeners = new Set<(paused: boolean) => void>();

// Pause is a single signal; subscribers own their own freeze.
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
  if (isStepRuntimeActive()) pauseStepRuntime();
  for (const fn of _pauseListeners) fn(true);
  bumpVersion();
}

export function resumeWiresRuntime(): void {
  if (!_running || !_paused) return;
  _paused = false;
  if (isStepRuntimeActive()) resumeStepRuntime();
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

export function getManualAckEdges(): ManualAckEdge[] { return _manualAckEdges; }
export function isManualAckEdge(edgeId: string): boolean { return _manualAckSet.has(edgeId); }
export function isSelfAckEdge(edgeId: string): boolean {
  return _selfAcksAll || _selfAckSet.has(edgeId);
}
export function getTriggerSlots(): TriggerSlot[] { return _triggerSlots; }

// Clear the receiver-side slot on a manual-ack wire. Returns true if a
// slot was cleared. No-op when wire is idle or not registered.
export function clearManualAckSlot(edgeId: string): boolean {
  if (!_manualAckSet.has(edgeId) || !_wires) return false;
  const w = _wires.get(edgeId);
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

const altHost: AltHostState = {
  setRunning: (v) => { _running = v; },
  setWires: (w) => { _wires = w; },
  setLoops: (l) => { _loops = l; },
  setManualAck: (e) => { _manualAckEdges = e; _manualAckSet.clear(); for (const x of e) _manualAckSet.add(x.id); },
  setSelfAcksAll: (v) => { _selfAcksAll = v; _selfAckSet.clear(); },
  setTriggerSlots: (s) => { _triggerSlots = s; },
};

export async function startWiresRuntime(spec: Spec): Promise<void> {
  await stopWiresRuntime();
  const shape = matchSubstrateShape(spec);
  if (tryStartAltSubstrate(spec, shape, USE_STEP_SUBSTRATE_SHAPE_A, altHost)) {
    bumpVersion();
    return;
  }
  _wires = buildWires(spec);
  const setup = shape === "input+inhibitor->readGate->i0->i1"
    ? setupInputReadGateInhibitorCycle(spec, _wires, awaitResumeGate)
    : shape === "input+inhibitor->readGate->i0"
      ? setupInputReadGateInhibitorWithI0(spec, _wires, awaitResumeGate)
      : shape === "input+inhibitor->readGate"
        ? setupInputReadGateInhibitor(spec, _wires, awaitResumeGate)
        : USE_PAIR_SUBSTRATE_SHAPE_A && shape === "input->readGate"
          ? setupInputReadGatePair(spec, _wires)
          : setupInputReadGate(spec, _wires, awaitResumeGate);
  _running = true;
  resetTotalTicks();
  _loops = setup.loops;
  _manualAckEdges = setup.manualAckEdges ?? [];
  _manualAckSet.clear();
  for (const e of _manualAckEdges) _manualAckSet.add(e.id);
  _selfAckSet.clear();
  for (const id of setup.selfAckEdges ?? []) _selfAckSet.add(id);
  _selfAcksAll = setup.selfAcksAll ?? false;
  _triggerSlots = setup.triggerSlots ?? [];
  slog("wires-runtime: started", {
    shape: shape ?? "input->readGate",
    edges: [...(_wires?.keys() ?? [])],
  });
  bumpVersion();
}

export async function stopWiresRuntime(): Promise<void> {
  if (tryStopAltSubstrate(altHost)) {
    bumpVersion();
    return;
  }
  if (!_running && _loops.length === 0 && !_wires) return;
  stopInputReadGatePair();
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
  const triggers = _triggerSlots;
  _loops = [];
  _wires = null;
  _manualAckEdges = [];
  _manualAckSet.clear();
  _selfAckSet.clear();
  _selfAcksAll = false;
  _triggerSlots = [];
  await stopAwaitRuntime(loops, wires, triggers);
  slog("wires-runtime: stopped", {});
  bumpVersion();
}
