// andGateLoop: multi-input join with reduce + outbound send + ack.

import { describe, expect, it } from "vitest";
import { ackWire, createWire } from "../../src/substrate/wire";
import { inputLoop, readGateLoop, andGateLoop } from "../../src/substrate/node-loop";

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe("andGateLoop", () => {
  it("joins two inputs, reduces, sends, acks both inbound", async () => {
    const a = createWire("a");
    const b = createWire("b");
    const out = createWire("o");
    const seen: unknown[] = [];
    const reachedTwo = new Promise<void>((resolve) => {
      out.onArrive((v) => {
        if (seen.length < 2) {
          seen.push(v);
          if (seen.length === 2) resolve();
        }
      });
    });

    const rg = readGateLoop(out, { autoAck: true });
    const gate = andGateLoop(
      [a, b],
      out,
      (vs) => (vs[0] as number) + (vs[1] as number),
    );
    // andGateLoop now waits for external ack on inbound before the next
    // cycle (mirrors joinLoop). Drive both acks on each out arrival.
    out.onArrive(() => {
      queueMicrotask(() => {
        if (a.state === "inFlight") ackWire(a);
        if (b.state === "inFlight") ackWire(b);
      });
    });
    const inA = inputLoop(a, [1, 10]);
    const inB = inputLoop(b, [2, 20]);

    await reachedTwo;
    expect(seen).toEqual([3, 30]);

    const stops = [inA.stop(), inB.stop(), gate.stop(), rg.stop()];
    if (a.state === "inFlight") ackWire(a);
    if (b.state === "inFlight") ackWire(b);
    if (out.state === "inFlight") ackWire(out);
    await Promise.all(stops);
  });

  it("waits for the slow input before firing", async () => {
    const a = createWire("a");
    const b = createWire("b");
    const out = createWire("o");
    let arrived = 0;
    let firstArrived: () => void = () => undefined;
    const arrivedOnce = new Promise<void>((r) => { firstArrived = r; });
    out.onArrive(() => { arrived += 1; firstArrived(); });
    const rg = readGateLoop(out, { autoAck: true });
    const gate = andGateLoop([a, b], out, (vs) => vs);

    const inA = inputLoop(a, [1]);
    await tick(); await tick();
    expect(arrived).toBe(0); // a alone is not enough

    const inB = inputLoop(b, [2]);
    await arrivedOnce;
    expect(arrived).toBeGreaterThanOrEqual(1);

    const stops = [inA.stop(), inB.stop(), gate.stop(), rg.stop()];
    if (a.state === "inFlight") ackWire(a);
    if (b.state === "inFlight") ackWire(b);
    if (out.state === "inFlight") ackWire(out);
    await Promise.all(stops);
  });
});
