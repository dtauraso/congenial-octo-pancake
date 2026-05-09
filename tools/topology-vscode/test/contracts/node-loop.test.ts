// Commit 2 contract: per-node loops drive a Wire end-to-end with no
// global scheduler. Input cycles its queue; ReadGate acks each value;
// the wire returns to idle between sends.

import { describe, expect, it } from "vitest";
import { ackWire, createWire } from "../../src/substrate/wire";
import { inputLoop, readGateLoop } from "../../src/substrate/node-loop";

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe("node-loop", () => {
  it("input + readGate cycle a wire idle -> inFlight -> idle", async () => {
    const w = createWire("e1");
    const seen: unknown[] = [];
    let inp: { stop(): Promise<void> } | null = null;
    let rg: { stop(): Promise<void> } | null = null;
    const reachedFive = new Promise<void>((resolve) => {
      w.onArrive((v) => {
        if (seen.length < 5) {
          seen.push(v);
          if (seen.length === 5) resolve();
        }
      });
    });

    rg = readGateLoop(w);
    inp = inputLoop(w, [1, 2, 3]);
    await reachedFive;

    expect(seen).toEqual([1, 2, 3, 1, 2]);

    await inp.stop();
    await rg.stop();
  });

  it("autoAck=false: external ackWire drives the cycle", async () => {
    const w = createWire("e1");
    const arrived: unknown[] = [];
    let pending: unknown = null;
    w.onArrive((v) => { pending = v; arrived.push(v); });
    const rg = readGateLoop(w, { autoAck: false });
    const inp = inputLoop(w, [10, 20, 30]);

    for (let i = 0; i < 4; i++) {
      while (pending === null) await tick();
      ackWire(w);
      pending = null;
      await tick();
    }
    expect(arrived.slice(0, 4)).toEqual([10, 20, 30, 10]);

    const stopP = inp.stop();
    if (w.state === "inFlight") ackWire(w);
    await stopP;
    await rg.stop();
  });

  it("empty queue: input loop exits cleanly without sending", async () => {
    const w = createWire("e1");
    let arrived = 0;
    w.onArrive(() => { arrived += 1; });
    const rg = readGateLoop(w);
    const inp = inputLoop(w, []);
    await tick();
    await tick();
    expect(arrived).toBe(0);
    expect(w.state).toBe("idle");
    await inp.stop();
    await rg.stop();
  });
});
