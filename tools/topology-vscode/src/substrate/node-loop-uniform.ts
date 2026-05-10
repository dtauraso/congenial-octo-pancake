// Step 1 of the uniform-node refactor. One loop shape for every node:
// read all inbound, self-ack (consume-on-read, uniform), decide, then
// fan-out to every outbound. Cycle edges, AND-joins, fan-outs, inputs,
// and seeds all collapse to per-node `decide` differences.
//
// No call sites use this yet — old variants (inputLoop, readGateLoop,
// joinLoop, andGateLoop, andGateLoopWithCycleInputs, andGateLoopFanOut)
// remain in tree until step 7.

import { ackWire, type Wire, type WireValue } from "./wire";
import type { NodeLoop } from "./node-loop";

export type Descriptor =
  | { kind: "send"; values: readonly WireValue[] }
  | { kind: "idle" }
  | { kind: "stop" };

export interface NodeSpec {
  readonly inbound: readonly Wire[];
  readonly outbound: readonly Wire[];
  decide(values: readonly WireValue[]): Descriptor;
  awaitGate?(): Promise<void>;
  onTick?(): void;
}

export function nodeLoop(node: NodeSpec): NodeLoop {
  let stopped = false;
  let wake: (() => void) | null = null;
  const raced = <T>(p: Promise<T>): Promise<T | "stop"> =>
    new Promise<T | "stop">((resolve) => {
      wake = () => resolve("stop");
      p.then((v) => resolve(v), (err) => resolve(err));
    });

  const done = (async () => {
    while (!stopped) {
      if (node.awaitGate) {
        const rg = await raced(node.awaitGate());
        wake = null;
        if (stopped || rg === "stop") break;
      }

      let values: readonly WireValue[];
      if (node.inbound.length === 0) {
        values = [];
      } else {
        const r = await raced(Promise.all(node.inbound.map((w) => w.awaitValue())));
        wake = null;
        if (stopped || r === "stop") break;
        values = r as readonly WireValue[];
        for (const w of node.inbound) {
          if (w.state === "inFlight") ackWire(w);
        }
      }

      const desc = node.decide(values);
      if (desc.kind === "stop") break;
      if (desc.kind === "idle") {
        await Promise.resolve();
        continue;
      }

      if (desc.values.length !== node.outbound.length) {
        throw new Error(
          `nodeLoop: decide returned ${desc.values.length} values for ${node.outbound.length} outbound wires`,
        );
      }

      const sends = node.outbound.map(async (w, i) => {
        await w.awaitReady();
        if (stopped) return;
        await w.send(desc.values[i]);
      });
      const r2 = await raced(Promise.all(sends));
      wake = null;
      if (stopped || r2 === "stop") break;
      node.onTick?.();
    }
  })();

  return {
    async stop() {
      stopped = true;
      wake?.();
      wake = null;
      await done.catch(() => undefined);
    },
  };
}
