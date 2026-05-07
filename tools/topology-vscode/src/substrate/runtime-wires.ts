// Wire-based substrate runtime for the trivial Input -> ReadGate
// topology. No event-bus or pulse-concurrency coupling. The legacy
// sim clock is still poked because PulseInstance reads getSimTime();
// step 4-5 retires that read and this poke goes with it.

import type { Spec } from "../schema";
import { readNodeInit } from "../sim/seeds";
import { state as legacyRunnerState, nowWall } from "../sim/runner/_state";
import { buildWires, type WireMap } from "./build-wires";
import { ackWire } from "./wire";
import { inputLoop, readGateLoop, type NodeLoop } from "./node-loop";
import { slog } from "./log";

let _loops: NodeLoop[] = [];
let _wires: WireMap | null = null;
let _running = false;
let _version = 0;
const _listeners = new Set<() => void>();

export function isWiresRuntimeRunning(): boolean {
  return _running;
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

function startSimClock(): void {
  legacyRunnerState.simSegmentStartWall = nowWall();
  legacyRunnerState.simAccumMs = 0;
  legacyRunnerState.playing = true;
}

function stopSimClock(): void {
  if (!legacyRunnerState.playing) return;
  legacyRunnerState.simAccumMs += nowWall() - legacyRunnerState.simSegmentStartWall;
  legacyRunnerState.playing = false;
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
  startSimClock();
  _loops = [readGateLoop(wire, { autoAck: false }), inputLoop(wire, queue)];
  slog("wires-runtime: started", {
    edgeId: edge.id,
    queue: queue.map(String),
  });
  bumpVersion();
}

export async function stopWiresRuntime(): Promise<void> {
  if (!_running && _loops.length === 0 && !_wires) return;
  _running = false;
  stopSimClock();
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
