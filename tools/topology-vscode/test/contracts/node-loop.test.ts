// Commit 2 contract: per-node loops drive a Wire end-to-end with no
// global scheduler. Input cycles its queue; ReadGate acks each value;
// the wire returns to idle between sends.

import { describe, expect, it } from "vitest";
import { createWire } from "../../src/substrate/wire";
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
});
