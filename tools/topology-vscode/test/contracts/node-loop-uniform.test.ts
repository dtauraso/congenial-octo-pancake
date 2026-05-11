// Step 1 contract: nodeLoop unifies every wiring shape into one loop.
// decide() is the only per-node difference. Six shapes covered here.

import { describe, expect, it } from "vitest";
import { ackWire, createWire, type Wire } from "../../src/substrate/wire";
import {
  nodeLoop,
  type Descriptor,
  type NodeSpec,
} from "../../src/substrate/node-loop-uniform";

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

const seedSpec = (out: Wire, value: unknown): NodeSpec => {
  let i = 0;
  return {
    inbound: [],
    outbound: [out],
    decide: (): Descriptor =>
      i++ === 0 ? { kind: "send", values: [value] } : { kind: "stop" },
  };
};

const drain = (w: Wire): void => {
  if (w.state === "inFlight") ackWire(w);
};

describe("node-loop-uniform", () => {
  it("input-style: closure-driven queue via decide", async () => {
    const w = createWire("e1", 1);
    const seen: unknown[] = [];
    w.onArrive((v) => { seen.push(v); });

    const queue = [1, 2, 3];
    let i = 0;
    const inp = nodeLoop({
      inbound: [],
      outbound: [w],
      decide: (): Descriptor => ({ kind: "send", values: [queue[i++ % queue.length]] }),
    });

    // Drive five acks so the loop cycles five times.
    for (let n = 0; n < 5; n++) {
      while (!w.hasValue) await tick();
      ackWire(w);
      await tick();
    }
    expect(seen.slice(0, 5)).toEqual([1, 2, 3, 1, 2]);
    await inp.stop();
    drain(w);
  });

  it("AND-join: two inbound reduced to one outbound", async () => {
    const a = createWire("a", 1);
    const b = createWire("b", 1);
    const out = createWire("out", 1);
    const sums: number[] = [];
    out.onArrive((v) => { sums.push(v as number); });

    const join = nodeLoop({
      inbound: [a, b],
      outbound: [out],
      decide: (vs): Descriptor => ({ kind: "send", values: [(vs[0] as number) + (vs[1] as number)] }),
    });

    void a.send(2); void b.send(3);
    while (!out.hasValue) await tick();
    expect(out.pending).toBe(5);
    ackWire(out);

    void a.send(10); void b.send(20);
    while (sums.length < 2) await tick();
    expect(sums).toEqual([5, 30]);
    ackWire(out);

    await join.stop();
  });

  it("fan-out: one inbound broadcast to two outbound", async () => {
    const inW = createWire("in", 1);
    const o1 = createWire("o1", 1);
    const o2 = createWire("o2", 1);
    const fan = nodeLoop({
      inbound: [inW],
      outbound: [o1, o2],
      decide: (vs): Descriptor => ({ kind: "send", values: [vs[0], vs[0]] }),
    });

    void inW.send(7);
    while (!o1.hasValue || !o2.hasValue) await tick();
    expect(o1.pending).toBe(7);
    expect(o2.pending).toBe(7);
    ackWire(o1); ackWire(o2);
    await fan.stop();
  });

  it("cycle self-pump: two nodes in a closed loop self-ack", async () => {
    const aToB = createWire("a->b", 1);
    const bToA = createWire("b->a", 1);
    const seen: number[] = [];

    const seed = nodeLoop(seedSpec(aToB, 0));

    let aCount = 0;
    const a = nodeLoop({
      inbound: [bToA],
      outbound: [aToB],
      decide: (vs): Descriptor => {
        const next = (vs[0] as number) + 1;
        seen.push(next);
        return aCount++ < 4 ? { kind: "send", values: [next] } : { kind: "stop" };
      },
    });
    const b = nodeLoop({
      inbound: [aToB],
      outbound: [bToA],
      decide: (vs): Descriptor => ({ kind: "send", values: [vs[0]] }),
    });

    // seed self-stops after one send; a self-stops after 5 round-trips.
    while (aCount <= 4) await tick();
    expect(seen).toEqual([1, 2, 3, 4, 5]);

    await seed.stop(); await a.stop(); await b.stop();
    drain(aToB); drain(bToA);
  });

  it("seed-then-stop: send round 0, stop round 1", async () => {
    const out = createWire("seed-out", 1);
    const arrived: unknown[] = [];
    out.onArrive((v) => { arrived.push(v); });

    const seed = nodeLoop(seedSpec(out, 42));
    while (!out.hasValue) await tick();
    expect(out.pending).toBe(42);
    ackWire(out);
    await tick(); await tick();
    expect(arrived).toEqual([42]);
    await seed.stop();
  });

  it("pause: awaitGate blocks the loop until released", async () => {
    const out = createWire("p-out", 1);
    let release!: () => void;
    let gate = new Promise<void>((r) => { release = r; });
    let sent = 0;

    const n = nodeLoop({
      inbound: [],
      outbound: [out],
      awaitGate: () => gate,
      decide: (): Descriptor => {
        sent++;
        return sent <= 1 ? { kind: "send", values: [sent] } : { kind: "stop" };
      },
    });

    await tick(); await tick();
    expect(sent).toBe(0);
    expect(out.hasValue).toBe(false);

    release();
    while (!out.hasValue) await tick();
    expect(out.pending).toBe(1);
    ackWire(out);
    await n.stop();
  });
});
