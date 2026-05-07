// Commit 2 contract: per-node loops drive a Wire end-to-end with no
// global scheduler. Input cycles its queue; ReadGate acks each value;
// the wire returns to idle between sends.

import { describe, expect, it } from "vitest";
import { ackWire, createWire } from "../../src/substrate/wire";
import { inputLoop, readGateLoop } from "../../src/substrate/node-loop";
import { startWiresRuntime, stopWiresRuntime, getWiresMap } from "../../src/substrate/runtime-wires";
import type { Spec } from "../../src/schema";

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

    // Wait for the first arrival, ack it, repeat.
    const tick = () => new Promise<void>((r) => setTimeout(r, 0));
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

describe("runtime-wires", () => {
  const spec = {
    nodes: [
      { id: "i", type: "Input", data: { init: [7, 8] } },
      { id: "r", type: "ReadGate" },
    ],
    edges: [
      { id: "i->r", source: "i", sourceHandle: "out", target: "r", targetHandle: "in", kind: "chain" },
    ],
  } as unknown as Spec;

  it("starts loops and exposes wire map", async () => {
    await startWiresRuntime(spec);
    const wires = getWiresMap();
    expect(wires?.size).toBe(1);
    expect(wires?.get("i->r")).toBeDefined();
    await stopWiresRuntime();
    expect(getWiresMap()).toBeNull();
  });

  it("stop is idempotent", async () => {
    await stopWiresRuntime();
    await stopWiresRuntime();
    expect(getWiresMap()).toBeNull();
  });

  it("subscribeNodeTicks: tick count matches send/ack count", async () => {
    const { subscribeNodeTicks } = await import("../../src/substrate/runtime-wires");
    const counts = new Map<string, number>();
    const off = subscribeNodeTicks((nodeId) => {
      counts.set(nodeId, (counts.get(nodeId) ?? 0) + 1);
    });
    await startWiresRuntime(spec);
    const wires = getWiresMap();
    const wire = wires?.get("i->r");
    if (!wire) throw new Error("wire missing");
    // Drive 3 ack cycles externally (autoAck=false in real runtime).
    for (let i = 0; i < 3; i++) {
      while (wire.state !== "inFlight") await new Promise((r) => setTimeout(r, 0));
      ackWire(wire);
      await new Promise((r) => setTimeout(r, 0));
    }
    await stopWiresRuntime();
    off();
    expect((counts.get("i") ?? 0)).toBeGreaterThanOrEqual(3);
    expect((counts.get("r") ?? 0)).toBeGreaterThanOrEqual(3);
  });
});
