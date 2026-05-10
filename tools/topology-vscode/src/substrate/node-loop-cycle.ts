// Variant of andGateLoop for nodes whose inbound includes a feedback
// edge from a downstream node in a closed cycle. Cycle-marked inbounds
// get consume-on-read semantics (sync ack right after awaitValue) and
// are excluded from the post-send awaitReady wait.
//
// Why: in a closed cycle, the feedback edge's producer is downstream
// in the same loop iteration. External auto-ack (visual or test) on
// the feedback wire would race ahead of this node's next-cycle
// awaitValue, draining the token before it's read. Consume-on-read
// captures-and-acks atomically inside this loop, so the cycle's
// per-cycle token survives the round trip.

import { ackWire, type Wire, type WireValue } from "./wire";
import type { NodeLoop } from "./node-loop";

export function andGateLoopWithCycleInputs(
  inbound: readonly Wire[],
  cycleMask: readonly boolean[],
  out: Wire,
  reduce: (values: readonly WireValue[]) => WireValue,
  opts: { onTick?: () => void } = {},
): NodeLoop {
  if (inbound.length !== cycleMask.length) {
    throw new Error("cycleMask length must match inbound length");
  }
  let stopped = false;
  let wakeCurrent: (() => void) | null = null;
  const racedWithStop = <T>(p: Promise<T>): Promise<T | "stop"> => {
    return new Promise<T | "stop">((resolve) => {
      wakeCurrent = () => resolve("stop");
      p.then((v) => resolve(v), (err) => resolve(err));
    });
  };
  const nonCycle = inbound.filter((_, i) => !cycleMask[i]);
  const done = (async () => {
    while (!stopped) {
      const r = await racedWithStop(Promise.all(inbound.map((w) => w.awaitValue())));
      wakeCurrent = null;
      if (stopped || r === "stop") break;
      const values = r as WireValue[];
      for (let i = 0; i < inbound.length; i++) {
        if (cycleMask[i] && inbound[i].state === "inFlight") ackWire(inbound[i]);
      }
      const result = reduce(values);
      const r2 = await racedWithStop(out.awaitReady());
      wakeCurrent = null;
      if (stopped || r2 === "stop") break;
      await out.send(result);
      opts.onTick?.();
      const r3 = await racedWithStop(Promise.all(nonCycle.map((w) => w.awaitReady())));
      wakeCurrent = null;
      if (stopped || r3 === "stop") break;
    }
  })();
  return {
    async stop() {
      stopped = true;
      wakeCurrent?.();
      wakeCurrent = null;
      await done.catch(() => undefined);
    },
  };
}
