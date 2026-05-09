// inputLoop gates each send on out.awaitReady before calling send().
// Pins the contract added in d01973e and the pause/resume gate consumed
// by the wires runtime.

import { describe, expect, it } from "vitest";
import { ackWire, createWire } from "../../src/substrate/wire";
import { inputLoop } from "../../src/substrate/node-loop";

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe("inputLoop awaitReady gating", () => {
  it("blocks the next send while the wire is held inFlight", async () => {
    const w = createWire("e1");
    const arrived: unknown[] = [];
    w.onArrive((v) => arrived.push(v));

    const inp = inputLoop(w, [1, 2, 3]);
    while (w.state !== "inFlight") await tick();
    expect(arrived).toEqual([1]);

    // Hold the wire inFlight; inputLoop must not call send() again.
    for (let i = 0; i < 5; i++) await tick();
    expect(arrived).toEqual([1]);
    expect(w.state).toBe("inFlight");

    ackWire(w);
    while (arrived.length < 2) await tick();
    expect(arrived).toEqual([1, 2]);

    const stopP = inp.stop();
    if (w.state === "inFlight") ackWire(w);
    await stopP;
  });

  it("awaitGate fires before each send (used by pause/resume)", async () => {
    const w = createWire("e1");
    const arrived: unknown[] = [];
    w.onArrive((v) => arrived.push(v));

    let paused = true;
    let resume: (() => void) | null = null;
    const awaitGate = () =>
      paused ? new Promise<void>((r) => { resume = r; }) : Promise.resolve();

    const inp = inputLoop(w, [10, 20], { awaitGate });

    // Held at the gate before any send.
    for (let i = 0; i < 5; i++) await tick();
    expect(arrived).toEqual([]);
    expect(w.state).toBe("idle");

    paused = false;
    resume?.();
    while (arrived.length < 1) await tick();
    expect(arrived).toEqual([10]);
    ackWire(w);
    while (arrived.length < 2) await tick();
    expect(arrived).toEqual([10, 20]);

    const stopP = inp.stop();
    if (w.state === "inFlight") ackWire(w);
    await stopP;
  });

  it("stop unblocks even when parked at awaitReady", async () => {
    const w = createWire("e1");
    const inp = inputLoop(w, [1, 2]);
    while (w.state !== "inFlight") await tick();
    // First send is in flight; loop will park at awaitReady on iteration 2
    // once we ack. Stop should still terminate cleanly.
    ackWire(w);
    await tick();
    // Now inputLoop is awaiting ready on iteration 2; wire is idle so
    // send() runs again and parks on ack. Hold it.
    while (w.state !== "inFlight") await tick();
    const stopP = inp.stop();
    ackWire(w);
    await stopP;
    expect(w.state).toBe("idle");
  });
});
