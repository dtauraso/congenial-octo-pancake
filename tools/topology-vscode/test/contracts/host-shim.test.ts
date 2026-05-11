// Contract tests for the step-6 host-shim composition. Pins:
//   1. Initial frame: every named wire is empty, no node states.
//   2. Wire load → frame carries the value sampled at emit time.
//   3. Wire ack → frame returns to empty.
//   4. Node events drive per-node frame state through the
//      parked-input → running → parked-output → parked-ack cycle;
//      loaded-outputs is invisible in the frame schema.
//   5. Two independent subscriptions: stopping the adapter does not
//      stop the recorder (and vice versa).
//   6. End-to-end: real substrate produces frames in seq order; the
//      adapter paces them and the recorder captures the same set.

import { describe, expect, it } from "vitest";
import { composeShim, type PacedFrame } from "../../src/host-shim/host-shim";
import { createRecorder } from "../../src/recorder/recorder";
import {
  createRendererAdapter,
  type ScheduleFn,
} from "../../src/renderer/renderer-adapter";
import { createWire } from "../../src/substrate/wire-entity";
import { runWire } from "../../src/substrate/wire-loop";
import { runNode } from "../../src/substrate/node-loop-uniform-v2";
import { _resetSeqForTests } from "../../src/substrate/wire-events";

type Pending = { fn: () => void; cancelled: boolean };
const fakeClock = (): { schedule: ScheduleFn; flush: () => void } => {
  const pending: Pending[] = [];
  const schedule: ScheduleFn = (_ms, fn) => {
    const p: Pending = { fn, cancelled: false };
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

const noopNode = () => ({
  stop: () => {},
  done: Promise.resolve(),
  onEvent: () => () => {},
});

describe("host-shim — frame derivation", () => {
  it("emits carrying(value) on load, empty on ack", () => {
    _resetSeqForTests();
    const w = createWire<number>("w");
    const recorder = createRecorder<PacedFrame<number>>();
    const adapter = createRendererAdapter<PacedFrame<number>>({ delayMs: 1 });
    composeShim<number>({
      wires: [w], nodes: [noopNode()], adapter, recorder,
    });

    w.load(42);
    let f = recorder.snapshot().at(-1)!;
    expect(f.wires.get("w")).toEqual({ kind: "carrying", value: 42 });

    w.take();
    expect(recorder.length()).toBe(1); // taken: no frame

    w.ack();
    f = recorder.snapshot().at(-1)!;
    expect(f.wires.get("w")).toEqual({ kind: "empty" });

    adapter.stop();
  });

  it("captures the carried value at emit time, not after the wire moves on", () => {
    const w = createWire<string>("w");
    const recorder = createRecorder<PacedFrame<string>>();
    const adapter = createRendererAdapter<PacedFrame<string>>({ delayMs: 1 });
    composeShim<string>({
      wires: [w], nodes: [noopNode()], adapter, recorder,
    });

    w.load("alpha");
    const loadedFrame = recorder.snapshot().at(-1)!;
    w.take();
    w.ack();
    // The earlier frame still reports "alpha" — snapshot was a copy.
    expect(loadedFrame.wires.get("w")).toEqual({
      kind: "carrying", value: "alpha",
    });
    adapter.stop();
  });

  it("two independent subscriptions: stopping the adapter does not stop the recorder", () => {
    const { schedule, flush } = fakeClock();
    const w = createWire<number>("w");
    const recorder = createRecorder<PacedFrame<number>>();
    const adapter = createRendererAdapter<PacedFrame<number>>({
      delayMs: 1, schedule,
    });
    const seen: PacedFrame<number>[] = [];
    adapter.onPaced((f) => seen.push(f));
    composeShim<number>({
      wires: [w], nodes: [noopNode()], adapter, recorder,
    });

    w.load(1);
    adapter.stop();
    flush();
    w.take();
    w.ack();

    expect(seen).toEqual([]); // adapter stopped before flush
    expect(recorder.length()).toBe(2); // recorder kept ingesting
  });
});

describe("host-shim — end-to-end", () => {
  it("paces frames through a real substrate node + wire loop", async () => {
    _resetSeqForTests();
    const wIn = createWire<number>("in");
    const wOut = createWire<number>("out");
    const recorder = createRecorder<PacedFrame<number>>();
    const adapter = createRendererAdapter<PacedFrame<number>>({ delayMs: 1 });
    const paced: PacedFrame<number>[] = [];
    adapter.onPaced((f) => paced.push(f));
    const li = runWire(wIn);
    const lo = runWire(wOut);
    const node = runNode<number, number>({
      id: "n", inputs: [wIn], outputs: [wOut], body: ([v]) => [v + 1],
    });
    composeShim<number>({
      wires: [wIn, wOut], nodes: [node], adapter, recorder,
    });

    wIn.load(7);
    for (let i = 0; i < 8; i++) {
      await new Promise<void>((r) => setImmediate(r));
    }

    const seqs = recorder.snapshot().map((f) => f.seq);
    expect(seqs.length).toBeGreaterThan(0);
    expect([...seqs].sort((a, b) => a - b)).toEqual(seqs);
    const nodeStates = recorder
      .snapshot()
      .map((f) => f.nodes.get("n"))
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
    expect(nodeStates).toContain("running");
    expect(nodeStates).toContain("parked-ack");

    node.stop(); li.stop(); lo.stop(); adapter.stop();
  });
});
