// Contract tests for the step-5 recorder. Pins:
//   1. Records every ingested event in arrival order.
//   2. snapshot() returns a copy — caller mutation does not leak in.
//   3. clear() empties the log.
//   4. stop() halts recording; later ingests are dropped.
//   5. End-to-end: substrate WireEvent + NodeEvent stream is captured
//      in seq order, independently of any renderer adapter.

import { describe, expect, it } from "vitest";
import { createRecorder } from "../../src/recorder/recorder";
import { createRendererAdapter } from "../../src/renderer/renderer-adapter";
import { createWire } from "../../src/substrate/wire-entity";
import { runWire } from "../../src/substrate/wire-loop";
import {
  runNode,
  type NodeEvent,
} from "../../src/substrate/node-loop-uniform-v2";
import {
  type WireEvent,
  _resetSeqForTests,
} from "../../src/substrate/wire-events";

describe("recorder — leaf log", () => {
  it("records events in arrival order", () => {
    const r = createRecorder<number>();
    r.ingest(1); r.ingest(2); r.ingest(3);
    expect(r.snapshot()).toEqual([1, 2, 3]);
    expect(r.length()).toBe(3);
  });

  it("snapshot returns a copy", () => {
    const r = createRecorder<number>();
    r.ingest(1); r.ingest(2);
    const s = r.snapshot() as number[];
    s.push(999);
    expect(r.snapshot()).toEqual([1, 2]);
  });

  it("clear empties the log", () => {
    const r = createRecorder<string>();
    r.ingest("a"); r.ingest("b");
    r.clear();
    expect(r.snapshot()).toEqual([]);
    expect(r.length()).toBe(0);
    r.ingest("c");
    expect(r.snapshot()).toEqual(["c"]);
  });

  it("stop halts further recording", () => {
    const r = createRecorder<number>();
    r.ingest(1);
    r.stop();
    r.ingest(2);
    expect(r.snapshot()).toEqual([1]);
  });
});

describe("recorder — end-to-end with substrate events", () => {
  it("captures wire + node events in seq order alongside the adapter", async () => {
    _resetSeqForTests();
    const recorder = createRecorder<WireEvent | NodeEvent>();
    const adapter = createRendererAdapter<WireEvent | NodeEvent>({
      delayMs: 1,
    });

    const wIn = createWire<number>("in");
    const wOut = createWire<number>("out");
    const fanOut = (e: WireEvent | NodeEvent): void => {
      recorder.ingest(e);
      adapter.ingest(e);
    };
    wIn.onEvent(fanOut);
    wOut.onEvent(fanOut);
    const li = runWire(wIn);
    const lo = runWire(wOut);
    const node = runNode<number, number>({
      id: "n", inputs: [wIn], outputs: [wOut], body: ([v]) => [v + 1],
    });
    node.onEvent(fanOut);

    wIn.load(7);
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));

    const seqs = recorder.snapshot().map((e) => e.seq);
    expect(seqs.length).toBeGreaterThan(0);
    const sorted = [...seqs].sort((a, b) => a - b);
    expect(seqs).toEqual(sorted);

    node.stop(); li.stop(); lo.stop(); adapter.stop();
  });
});
