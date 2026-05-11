// Step 6 of the substrate iteration plan: host-shim composition.
// Composes substrate (wires + uniform node loops) with the step-4
// renderer adapter and step-5 recorder via two independent
// subscriptions per handoff-next-task.md. Derives PacedFrame
// snapshots — per-wire empty|loaded(value)|taken(value), per-node
// parked-input|running|parked-output|parked-ack — sampled at
// event-emit time so the carried value is captured before the
// substrate moves on. Leaf module: no DOM, no extension host, no
// webview message bus. Pacing is delegated to the adapter; the
// substrate stays timing-free per MODEL.md.

import type { Wire } from "../substrate/wire-entity";
import type { WireEvent } from "../substrate/wire-events";
import type {
  NodeEvent,
  NodeLoopHandleV2,
} from "../substrate/node-loop-uniform-v2";
import type { RendererAdapter } from "../renderer/renderer-adapter";
import type { Recorder } from "../recorder/recorder";

export type WireFrameState<V> =
  | { readonly kind: "empty" }
  | { readonly kind: "loaded"; readonly value: V }
  | { readonly kind: "taken"; readonly value: V };

export type NodeFrameState =
  | "parked-input"
  | "running"
  | "parked-output"
  | "parked-ack";

export interface PacedFrame<V> {
  readonly seq: number;
  readonly wires: ReadonlyMap<string, WireFrameState<V>>;
  readonly nodes: ReadonlyMap<string, NodeFrameState>;
}

export interface ShimInputs<V> {
  readonly wires: readonly Wire<V>[];
  readonly nodes: readonly NodeLoopHandleV2[];
  readonly adapter: RendererAdapter<PacedFrame<V>>;
  readonly recorder: Recorder<PacedFrame<V>>;
}

export interface ShimHandle {
  stop(): void;
}

const NODE_STATE: Partial<Record<NodeEvent["kind"], NodeFrameState>> = {
  "parked-input": "parked-input",
  "entered-run": "running",
  "parked-output": "parked-output",
  "parked-ack": "parked-ack",
};

export function composeShim<V>(io: ShimInputs<V>): ShimHandle {
  const wireState = new Map<string, WireFrameState<V>>();
  const nodeState = new Map<string, NodeFrameState>();
  for (const w of io.wires) wireState.set(w.id, { kind: "empty" });

  const snapshot = (seq: number): PacedFrame<V> => ({
    seq,
    wires: new Map(wireState),
    nodes: new Map(nodeState),
  });

  const fanOut = (frame: PacedFrame<V>): void => {
    io.recorder.ingest(frame);
    io.adapter.ingest(frame);
  };

  const offs: Array<() => void> = [];
  for (const w of io.wires) {
    offs.push(
      w.onEvent((e: WireEvent) => {
        if (e.kind === "loaded" && w.state.kind === "loaded") {
          wireState.set(w.id, { kind: "loaded", value: w.state.value });
          fanOut(snapshot(e.seq));
        } else if (e.kind === "taken" && w.state.kind === "taken") {
          wireState.set(w.id, { kind: "taken", value: w.state.value });
          fanOut(snapshot(e.seq));
        } else if (e.kind === "acked" || e.kind === "cleared") {
          wireState.set(w.id, { kind: "empty" });
          fanOut(snapshot(e.seq));
        }
      }),
    );
  }
  for (const n of io.nodes) {
    offs.push(
      n.onEvent((e: NodeEvent) => {
        const s = NODE_STATE[e.kind];
        if (!s) return;
        nodeState.set(e.nodeId, s);
        fanOut(snapshot(e.seq));
      }),
    );
  }

  return {
    stop: (): void => {
      for (const off of offs) off();
    },
  };
}
