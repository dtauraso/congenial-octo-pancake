// Wire-based substrate runtime. Replaces the global-bus runtime in
// runtime.ts for the trivial Input -> ReadGate topology. No legacy
// coupling: nothing here imports event-bus, legacyRunnerState, or
// pulse-concurrency.
//
// Lifecycle: startWiresRuntime(spec) builds wires, starts loops;
// stopWiresRuntime() halts loops and drops the wire map. The visual
// layer (commit 3) reads wires via getWiresMap().

import type { Spec } from "../schema";
import { readNodeInit } from "../sim/seeds";
import { buildWires, type WireMap } from "./build-wires";
import { inputLoop, readGateLoop, type NodeLoop } from "./node-loop";
import { slog } from "./log";

let _loops: NodeLoop[] = [];
let _wires: WireMap | null = null;
let _running = false;

export function isWiresRuntimeRunning(): boolean {
  return _running;
}

export function getWiresMap(): WireMap | null {
  return _wires;
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
  _loops = [readGateLoop(wire), inputLoop(wire, queue)];
  slog("wires-runtime: started", {
    edgeId: edge.id,
    queue: queue.map(String),
  });
}

export async function stopWiresRuntime(): Promise<void> {
  if (!_running && _loops.length === 0 && !_wires) return;
  _running = false;
  const loops = _loops;
  _loops = [];
  _wires = null;
  for (const l of loops) await l.stop();
  slog("wires-runtime: stopped", {});
}
