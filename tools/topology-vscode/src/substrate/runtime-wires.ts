// Wire-based substrate runtime for the trivial Input -> ReadGate
// topology. No event-bus, pulse-concurrency, or sim-clock coupling.
// PulseInstance reads performance.now() directly, so the renderer
// owns its own timing.

import type { Spec } from "../schema";
import { readNodeInit } from "../sim/seeds";
import { notifyState } from "../sim/event-bus";
import { buildWires, type WireMap } from "./build-wires";
import { ackWire } from "./wire";
import { inputLoop, readGateLoop, type NodeLoop } from "./node-loop";
import { slog } from "./log";

let _loops: NodeLoop[] = [];
let _wires: WireMap | null = null;
let _running = false;
let _paused = false;
let _resumeWaiters: Array<() => void> = [];
let _version = 0;
const _listeners = new Set<() => void>();

export function isWiresRuntimeRunning(): boolean {
  return _running;
}

export function isWiresRuntimePaused(): boolean {
  return _paused;
}

// Toolbar pause: stops issuing new sends. An in-flight pulse finishes
// its arc and acks normally; the input loop then awaits the gate at
// the top of its next iteration.
export function pauseWiresRuntime(): void {
  if (!_running || _paused) return;
  _paused = true;
  notifyState();
  bumpVersion();
}

export function resumeWiresRuntime(): void {
  if (!_running || !_paused) return;
  _paused = false;
  const waiters = _resumeWaiters;
  _resumeWaiters = [];
  for (const w of waiters) w();
  notifyState();
  bumpVersion();
}

function awaitResumeGate(): Promise<void> {
  if (!_paused) return Promise.resolve();
  return new Promise<void>((resolve) => {
    _resumeWaiters.push(resolve);
  });
}

export function getWiresMap(): WireMap | null {
  return _wires;
}

export function getWiresVersion(): number {
  return _version;
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
  const input = spec.nodes.find((n) => n.type === "Input");
  const readGate = spec.nodes.find((n) => n.type === "ReadGate");
  if (!input || !readGate) {
    slog("wires-runtime: missing Input or ReadGate", {});
    return;
  }
  const edge = spec.edges.find(
    (e) => e.source === input.id && e.target === readGate.id,
  );
  if (!edge) {
    slog("wires-runtime: missing Input->ReadGate edge", {});
    return;
  }
  _wires = buildWires(spec);
  const wire = _wires.get(edge.id);
  if (!wire) {
    slog("wires-runtime: wire not built for edge", { edgeId: edge.id });
    _wires = null;
    return;
  }
  const queue = readNodeInit(input.data);
  _running = true;
  _loops = [
    readGateLoop(wire, { autoAck: false }),
    inputLoop(wire, queue, { awaitGate: awaitResumeGate }),
  ];
  slog("wires-runtime: started", {
    edgeId: edge.id,
    queue: queue.map(String),
  });
  bumpVersion();
}

export async function stopWiresRuntime(): Promise<void> {
  if (!_running && _loops.length === 0 && !_wires) return;
  _running = false;
  // Wake any pause waiters so the input loop unblocks and observes
  // stopped=true on its next iteration. Without this, stop() would
  // hang on a paused-and-stopped loop.
  _paused = false;
  const waiters = _resumeWaiters;
  _resumeWaiters = [];
  for (const w of waiters) w();
  const loops = _loops;
  const wires = _wires;
  _loops = [];
  _wires = null;
  // Kick off loop stops first (sets each loop's stopped=true
  // synchronously), THEN ack any in-flight wires so inputLoop's
  // await out.send() resolves and the loop sees stopped=true on the
  // next iteration. Without the ack, autoAck=false leaves the wire
  // stuck inFlight when stop fires before a renderer ack.
  const stops = loops.map((l) => l.stop());
  if (wires) for (const w of wires.values()) if (w.state === "inFlight") ackWire(w);
  await Promise.all(stops);
  slog("wires-runtime: stopped", {});
  bumpVersion();
}
