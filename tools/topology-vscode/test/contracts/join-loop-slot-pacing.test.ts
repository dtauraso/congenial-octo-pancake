// Contract: does joinLoop already give per-edge slot pacing?
//
// Two manual sources feed a joinLoop over wires A and B. After the first
// fire we hold B's ack (slow source) and ack A. The question: can source
// A refill its edge — i.e. wA goes idle then inFlight again with a new
// value — while B is still inFlight from the previous round?
//
// If yes, the wire+joinLoop pair already implements per-source slot
// backpressure structurally; the "barrier" is only on the loop's
// re-entry to awaitValue, not on a slot's right to refill.
//
// We drive sends manually (not via inputLoop) so the test owns timing
// fully and cleanup is trivial.

import { describe, expect, it } from "vitest";
import { ackWire, createWire } from "../../src/substrate/wire";
import { joinLoop } from "../../src/substrate/node-loop";

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

// A "source" that mirrors inputLoop's gating: awaitReady → send → repeat.
// Returns a stop() that completes after any in-flight send is acked.
function manualSource(wire: ReturnType<typeof createWire>, queue: number[]) {
  let stopped = false;
  const done = (async () => {
    let i = 0;
    while (!stopped && i < queue.length) {
      await wire.awaitReady();
      if (stopped) break;
      await wire.send(queue[i]);
      i += 1;
    }
  })();
  return { stop: async () => { stopped = true; await done.catch(() => undefined); } };
}

describe("joinLoop per-edge slot pacing", () => {
  it("fast source refills its edge while slow source is still held", async () => {
    const wA = createWire("A");
    const wB = createWire("B");

    const aValues: unknown[] = [];
    const bValues: unknown[] = [];
    wA.onArrive((v) => aValues.push(v));
    wB.onArrive((v) => bValues.push(v));

    let fires = 0;
    const join = joinLoop([wA, wB], { onFire: () => { fires += 1; } });

    const srcA = manualSource(wA, [1, 2, 3]);
    const srcB = manualSource(wB, [10, 20, 30]);

    while (fires < 1) await tick();
    expect(wA.state).toBe("inFlight");
    expect(wB.state).toBe("inFlight");
    expect(aValues).toEqual([1]);
    expect(bValues).toEqual([10]);

    // Ack only A. Source A should observe wA idle and send 2.
    ackWire(wA);
    for (let i = 0; i < 5; i += 1) await tick();

    expect(aValues).toEqual([1, 2]);     // A refilled
    expect(bValues).toEqual([10]);       // B has not advanced
    expect(wA.state).toBe("inFlight");   // A's slot is full again
    expect(wB.state).toBe("inFlight");   // B's slot is still full with old value
    expect(fires).toBe(1);               // join has not refired yet

    // Now ack B. The drain-barrier in joinLoop resolves and the loop
    // re-enters awaitValue; wA already holds 2, srcB sends 20.
    ackWire(wB);
    while (fires < 2) await tick();
    expect(aValues).toEqual([1, 2]);
    expect(bValues).toEqual([10, 20]);

    // Cleanup: drain in-flight wires so manualSource sends resolve.
    if (wA.state === "inFlight") ackWire(wA);
    if (wB.state === "inFlight") ackWire(wB);
    await tick();
    if (wA.state === "inFlight") ackWire(wA);
    if (wB.state === "inFlight") ackWire(wB);
    await srcA.stop();
    await srcB.stop();
    await join.stop();
  });
});
