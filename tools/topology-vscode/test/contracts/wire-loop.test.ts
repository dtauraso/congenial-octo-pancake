// Contract tests for the wire's forever-loop and pause-aware helper.
// Pins two claims from handoff-substrate-iteration.md:
//
//   1. Event ordering: load → take → ack emits loaded, taken, acked
//      with strictly increasing ordinal sequence numbers.
//   2. Pause mid-rendezvous: pausing while a wire is loaded but not
//      yet taken keeps the wire-loop parked (no ack), and resume
//      lets it finish the round.

import { describe, expect, it } from "vitest";
import { createWire, type WireEvent } from "../../src/substrate/wire-entity";
import { runWire } from "../../src/substrate/wire-loop";
import { pauseAware } from "../../src/substrate/pause-aware";
import { createPauseController } from "../../src/substrate/pause-controller";

describe("wire-loop — event ordering", () => {
  it("emits loaded → taken → acked with increasing seq", async () => {
    const wire = createWire<number>("w1");
    const events: WireEvent[] = [];
    wire.onEvent((e) => events.push(e));
    const handle = runWire(wire);

    wire.load(7);
    // Yield so wire-loop observes loaded.
    await new Promise<void>((r) => setImmediate(r));
    expect(wire.take()).toBe(7);
    // Yield so wire-loop observes taken and runs ack.
    await new Promise<void>((r) => setImmediate(r));

    handle.stop();
    expect(events.map((e) => e.kind)).toEqual(["loaded", "taken", "acked"]);
    expect(events[0].seq).toBeLessThan(events[1].seq);
    expect(events[1].seq).toBeLessThan(events[2].seq);
  });
});

describe("pause-aware — mid-rendezvous", () => {
  it("parks the wire-loop between loaded and taken; resume completes the round", async () => {
    const pause = createPauseController();
    const wire = createWire<string>("w2");
    const events: string[] = [];
    wire.onEvent((e) => events.push(e.kind));
    const handle = runWire(wire, pause);

    wire.load("v");
    await new Promise<void>((r) => setImmediate(r));
    // Pause while wire is loaded but not yet taken. Wire-loop is
    // parked at awaitTaken; nothing should ack.
    pause.pause();
    wire.take();
    await new Promise<void>((r) => setImmediate(r));
    expect(events).toEqual(["loaded", "taken"]); // no acked yet
    expect(wire.state.kind).toBe("taken");

    pause.resume();
    await new Promise<void>((r) => setImmediate(r));
    expect(events).toEqual(["loaded", "taken", "acked"]);
    expect(wire.state.kind).toBe("empty");

    handle.stop();
  });

  it("pauseAware short-circuits when no pause signal is given", async () => {
    const result = await pauseAware(() => Promise.resolve(123));
    expect(result).toBe(123);
  });
});
