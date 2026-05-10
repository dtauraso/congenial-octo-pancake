// Step 7b: host-side runner. Constructs wire-entities + uniform-v2
// node loops from a parsed Spec, composes them with a paced renderer
// adapter and a recorder via composeShim, and posts serialized
// FrameMsg to a caller-supplied sink (typically panel.webview.postMessage
// in extension.ts). Lives outside src/substrate/ because pacing and
// the message bus are not substrate concerns.
//
// Per-node behavior for 7b: identity broadcast. Each node's body
// forwards its first input value to all outputs. Nodes with zero
// inputs are skipped (sources need a seed mechanism, out of scope
// for 7b). Richer node kinds (and-gate, latch, ...) land later.

import type { Spec, StateValue } from "../schema";
import type { FrameMsg } from "../messages";
import { buildWireEntities } from "../substrate/build-wire-entities";
import {
  runNode,
  type NodeLoopHandleV2,
  type NodeSpecV2,
} from "../substrate/node-loop-uniform-v2";
import { runWire, type WireLoopHandle } from "../substrate/wire-loop";
import type { Wire } from "../substrate/wire-entity";
import { pauseAware, type PauseSignal } from "../substrate/pause-aware";
import {
  createPauseController,
  type PauseController,
} from "../substrate/pause-controller";
import {
  createRendererAdapter,
  type AdapterOptions,
} from "../renderer/renderer-adapter";
import { createRecorder, type Recorder } from "../recorder/recorder";
import { readNodeInit } from "../sim/seeds";
import { composeShim, type PacedFrame } from "./host-shim";
import { serializeFrame } from "./serialize-frame";

export interface RunFramesOptions {
  readonly spec: Spec;
  readonly post: (msg: FrameMsg) => void;
  readonly delayMs?: number;
  readonly schedule?: AdapterOptions["schedule"];
}

export interface RunFramesHandle {
  stop(): void;
  pause(): void;
  resume(): void;
  readonly paused: boolean;
  readonly recorder: Recorder<PacedFrame<unknown>>;
}

export function runFrames(opts: RunFramesOptions): RunFramesHandle {
  const wires = buildWireEntities(opts.spec);
  const nodes: NodeLoopHandleV2[] = [];
  const wireLoops: WireLoopHandle[] = [];
  const sources: SourceHandle[] = [];

  const pause: PauseController = createPauseController();
  for (const w of wires.values()) wireLoops.push(runWire(w, pause));

  for (const node of opts.spec.nodes) {
    const inputs: Wire<unknown>[] = [];
    const outputs: Wire<unknown>[] = [];
    for (const edge of opts.spec.edges ?? []) {
      const w = wires.get(edge.id);
      if (!w) continue;
      if (edge.target === node.id) inputs.push(w);
      if (edge.source === node.id) outputs.push(w);
    }
    if (inputs.length === 0) {
      const queue = readNodeInit(node.data) as unknown as readonly unknown[];
      if (outputs.length > 0 && queue.length > 0) {
        sources.push(spawnSource(outputs, queue, pause));
      }
      continue;
    }
    const nodeSpec: NodeSpecV2<unknown, unknown> = {
      id: node.id,
      inputs,
      outputs,
      body: (vals) => outputs.map(() => vals[0]),
    };
    nodes.push(runNode(nodeSpec, pause));
  }

  const adapter = createRendererAdapter<PacedFrame<unknown>>({
    delayMs: opts.delayMs ?? 200,
    schedule: opts.schedule,
  });
  const recorder = createRecorder<PacedFrame<unknown>>();
  adapter.onPaced((frame) => opts.post(serializeFrame(frame)));

  const shim = composeShim<unknown>({
    wires: Array.from(wires.values()),
    nodes,
    adapter,
    recorder,
  });

  return {
    stop: () => {
      shim.stop();
      for (const n of nodes) n.stop();
      for (const wl of wireLoops) wl.stop();
      for (const s of sources) s.stop();
      adapter.stop();
      recorder.stop();
    },
    pause: () => pause.pause(),
    resume: () => pause.resume(),
    get paused() { return pause.paused; },
    recorder,
  };
}

interface SourceHandle { stop(): void }

function spawnSource<V>(
  outputs: readonly Wire<V>[],
  queue: readonly V[],
  pause?: PauseSignal,
): SourceHandle {
  let running = true;
  void (async () => {
    for (const v of queue) {
      if (!running) return;
      await Promise.all(
        outputs.map((w) => pauseAware(() => w.awaitEmpty(), pause)),
      );
      if (!running) return;
      for (const w of outputs) w.load(v);
      await Promise.all(
        outputs.map((w) => pauseAware(() => w.awaitAcked(), pause)),
      );
    }
  })();
  return { stop: () => { running = false; } };
}
