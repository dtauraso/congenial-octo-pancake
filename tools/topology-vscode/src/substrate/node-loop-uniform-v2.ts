// Step 3 of the substrate iteration plan: uniform node forever-loop
// over wire-entity / pause-aware. Coexists with legacy
// node-loop-uniform.ts. Body per handoff-substrate-iteration.md:
// await inputs loaded → run → await outputs empty → load outputs
// → await outputs acked. Every wait routes through pauseAware().
// Substrate is timing-free per MODEL.md.

import type { Wire } from "./wire-entity";
import { pauseAware, type PauseSignal } from "./pause-aware";
import { nextSeq } from "./wire-events";

export type NodeEventKind =
  | "parked-input"
  | "entered-run"
  | "parked-output"
  | "loaded-outputs"
  | "parked-ack";

export interface NodeEvent {
  readonly seq: number;
  readonly nodeId: string;
  readonly kind: NodeEventKind;
}

export interface NodeSpecV2<I, O> {
  readonly id: string;
  readonly inputs: readonly Wire<I>[];
  readonly outputs: readonly Wire<O>[];
  body(values: readonly I[]): readonly O[];
}

export interface NodeLoopHandleV2 {
  stop(): void;
  done: Promise<void>;
  onEvent(listener: (e: NodeEvent) => void): () => void;
}

export function runNode<I, O>(
  spec: NodeSpecV2<I, O>,
  pause?: PauseSignal,
): NodeLoopHandleV2 {
  let running = true;
  const listeners = new Set<(e: NodeEvent) => void>();
  const emit = (kind: NodeEventKind): void => {
    const evt: NodeEvent = { seq: nextSeq(), nodeId: spec.id, kind };
    for (const l of listeners) l(evt);
  };
  const awaitAll = (ps: Promise<void>[]): Promise<void> =>
    Promise.all(ps).then(() => undefined);

  const done = (async () => {
    while (running) {
      emit("parked-input");
      await awaitAll(
        spec.inputs.map((w) => pauseAware(() => w.awaitLoaded(), pause)),
      );
      if (!running) return;
      await awaitAll(
        spec.inputs.map((w) => pauseAware(() => w.awaitArrived(), pause)),
      );
      if (!running) return;
      const values = spec.inputs.map((w) => w.take());
      emit("entered-run");
      const outVals = spec.body(values);
      if (outVals.length !== spec.outputs.length) {
        throw new Error(
          `node ${spec.id}: body returned ${outVals.length} values for ` +
            `${spec.outputs.length} outputs`,
        );
      }
      emit("parked-output");
      await awaitAll(
        spec.outputs.map((w) => pauseAware(() => w.awaitEmpty(), pause)),
      );
      if (!running) return;
      for (let i = 0; i < spec.outputs.length; i++) {
        spec.outputs[i].load(outVals[i]);
      }
      emit("loaded-outputs");
      emit("parked-ack");
      await awaitAll(
        spec.outputs.map((w) => pauseAware(() => w.awaitAcked(), pause)),
      );
      if (!running) return;
    }
  })();

  return {
    stop: () => {
      running = false;
    },
    done,
    onEvent: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
