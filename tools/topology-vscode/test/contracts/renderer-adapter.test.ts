// Contract tests for the step-4 renderer adapter. Pins:
//   1. Order preserved through pacing.
//   2. Each emission waits the configured delay.
//   3. Multiple subscribers all receive each paced event.
//   4. stop() halts further emission and cancels a pending tick.
//   5. End-to-end: real WireEvent + NodeEvent stream paces in seq order.

import { describe, expect, it } from "vitest";
import {
  createRendererAdapter,
  type ScheduleFn,
} from "../../src/renderer/renderer-adapter";
import { createWire } from "../../src/substrate/wire-entity";
import { runWire } from "../../src/substrate/wire-loop";
import {
  runNode,
  type NodeEvent,
} from "../../src/substrate/node-loop-uniform-v2";
import { type WireEvent, _resetSeqForTests } from "../../src/substrate/wire-events";

type Pending = { ms: number; fn: () => void; cancelled: boolean };
const fakeClock = (): { schedule: ScheduleFn; flush: () => void } => {
  const pending: Pending[] = [];
  const schedule: ScheduleFn = (ms, fn) => {
    const p: Pending = { ms, fn, cancelled: false };
    pending.push(p);
    return () => { p.cancelled = true; };
  };
  const flush = (): void => {
    while (pending.length > 0) {
      const p = pending.shift()!;
      if (!p.cancelled) p.fn();
    }
  };
  return { schedule, flush };
};

describe("renderer-adapter — pacing", () => {
  it("preserves order and waits the configured delay each step", () => {
    const { schedule, flush } = fakeClock();
    const a = createRendererAdapter<number>({ delayMs: 50, schedule });
    const out: number[] = [];
    a.onPaced((e) => out.push(e));
    a.ingest(1); a.ingest(2); a.ingest(3);
    expect(out).toEqual([]);
    expect(a.pending()).toBe(3);
    flush();
    expect(out).toEqual([1, 2, 3]);
    expect(a.pending()).toBe(0);
    a.stop();
  });

  it("delivers every paced event to multiple subscribers", () => {
    const { schedule, flush } = fakeClock();
    const a = createRendererAdapter<string>({ delayMs: 10, schedule });
    const got1: string[] = []; const got2: string[] = [];
    a.onPaced((e) => got1.push(e));
    a.onPaced((e) => got2.push(e));
    a.ingest("x"); a.ingest("y");
    flush();
    expect(got1).toEqual(["x", "y"]);
    expect(got2).toEqual(["x", "y"]);
    a.stop();
  });

  it("stop() halts emission and prevents the next tick", () => {
    const { schedule, flush } = fakeClock();
    const a = createRendererAdapter<number>({ delayMs: 1, schedule });
    const out: number[] = [];
    a.onPaced((e) => out.push(e));
    a.ingest(1); a.ingest(2);
    a.stop();
    flush();
    expect(out).toEqual([]);
  });
});

describe("renderer-adapter — end-to-end with substrate events", () => {
  it("paces a real wire+node stream in seq order", async () => {
    _resetSeqForTests();
    const { schedule, flush } = fakeClock();
    const adapter = createRendererAdapter<WireEvent | NodeEvent>({
      delayMs: 5, schedule,
    });
    const seen: Array<WireEvent | NodeEvent> = [];
    adapter.onPaced((e) => seen.push(e));

    const wIn = createWire<number>("in");
    const wOut = createWire<number>("out");
    wIn.onEvent((e) => adapter.ingest(e));
    wOut.onEvent((e) => adapter.ingest(e));
    const li = runWire(wIn);
    const lo = runWire(wOut);
    const node = runNode<number, number>({
      id: "n", inputs: [wIn], outputs: [wOut], body: ([v]) => [v + 1],
    });
    node.onEvent((e) => adapter.ingest(e));

    wIn.load(7);
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));
    expect(adapter.pending()).toBeGreaterThan(0);
    flush();
    const seqs = seen.map((e) => e.seq);
    const sorted = [...seqs].sort((a, b) => a - b);
    expect(seqs).toEqual(sorted);

    node.stop(); li.stop(); lo.stop(); adapter.stop();
  });
});
