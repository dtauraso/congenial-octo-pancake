// Contract tests for the step-3 uniform node loop. Pins:
//   1. Single-in/single-out passes one value end-to-end.
//   2. Multi-input parks until all inputs carrying, then runs once.
//   3. Multi-output parks at output-empty until destinations have
//      acked before next round.
//   4. Pause mid-run freezes; resume completes the round.

import { describe, expect, it } from "vitest";
import { createWire } from "../../src/substrate/wire-entity";
import { runWire } from "../../src/substrate/wire-loop";
import {
  runNode,
  type NodeEvent,
} from "../../src/substrate/node-loop-uniform-v2";
import { createPauseController } from "../../src/substrate/pause-controller";

const tick = (): Promise<void> =>
  new Promise<void>((r) => setImmediate(r));
const tickN = async (n = 5): Promise<void> => {
  for (let i = 0; i < n; i++) await tick();
};

describe("node-loop-uniform-v2 — single in / single out", () => {
  it("passes one value end-to-end", async () => {
    const wIn = createWire<number>("in");
    const wOut = createWire<number>("out");
    const li = runWire(wIn);
    const lo = runWire(wOut);
    const node = runNode<number, number>({
      id: "n1",
      inputs: [wIn],
      outputs: [wOut],
      body: ([v]) => [v * 2],
    });

    wIn.load(5);
    await tickN();
    expect(wOut.state.kind).toBe("carrying");
    expect(wOut.take()).toBe(10);
    await tickN();
    expect(wOut.state.kind).toBe("empty");

    node.stop();
    li.stop();
    lo.stop();
  });
});

describe("node-loop-uniform-v2 — multi-input join", () => {
  it("parks until all inputs carrying; runs once after both load", async () => {
    const a = createWire<number>("a");
    const b = createWire<number>("b");
    const out = createWire<number>("o");
    const la = runWire(a);
    const lb = runWire(b);
    const lo = runWire(out);
    const events: NodeEvent[] = [];
    const node = runNode<number, number>({
      id: "sum",
      inputs: [a, b],
      outputs: [out],
      body: ([x, y]) => [x + y],
    });
    node.onEvent((e) => events.push(e));

    a.load(3);
    await tickN();
    expect(out.state.kind).toBe("empty");
    expect(events.find((e) => e.kind === "entered-run")).toBeUndefined();

    b.load(4);
    await tickN();
    expect(out.state.kind).toBe("carrying");
    expect(out.take()).toBe(7);
    await tickN();

    node.stop();
    la.stop();
    lb.stop();
    lo.stop();
  });
});

describe("node-loop-uniform-v2 — multi-output ack backpressure", () => {
  it("withholds round 2 until both outputs acked", async () => {
    const inp = createWire<number>("i");
    const o1 = createWire<number>("o1");
    const o2 = createWire<number>("o2");
    const li = runWire(inp);
    // No wire-loops on outputs; we drive ack manually to observe parking.
    const node = runNode<number, number>({
      id: "fan",
      inputs: [inp],
      outputs: [o1, o2],
      body: ([v]) => [v, v + 1],
    });

    inp.load(1);
    await tickN();
    expect(o1.state.kind).toBe("carrying");
    expect(o2.state.kind).toBe("carrying");

    // Try to push round 2 while outputs still carrying. Node is parked
    // at outputs.awaitAcked, so it must NOT load new output values.
    inp.load(10);
    await tickN();
    expect(o1.state.kind === "carrying" && o1.state.value).toBe(1);
    expect(o2.state.kind === "carrying" && o2.state.value).toBe(2);

    // Manually drain outputs.
    o1.take();
    o1.ack();
    o2.take();
    o2.ack();
    await tickN();

    // Round 2 should now have produced new outputs.
    expect(o1.state.kind === "carrying" && o1.state.value).toBe(10);
    expect(o2.state.kind === "carrying" && o2.state.value).toBe(11);

    o1.take();
    o1.ack();
    o2.take();
    o2.ack();
    await tickN();
    node.stop();
    li.stop();
  });
});

describe("node-loop-uniform-v2 — pause mid-run", () => {
  it("freezes the loop and resumes from the same line", async () => {
    const pause = createPauseController();
    const inp = createWire<number>("i");
    const out = createWire<number>("o");
    const li = runWire(inp, pause);
    const lo = runWire(out, pause);
    const node = runNode<number, number>(
      {
        id: "p",
        inputs: [inp],
        outputs: [out],
        body: ([v]) => [v + 1],
      },
      pause,
    );

    pause.pause();
    inp.load(7);
    await tickN();
    expect(out.state.kind).toBe("empty");

    pause.resume();
    await tickN();
    expect(out.state.kind).toBe("carrying");
    expect(out.take()).toBe(8);
    await tickN();

    node.stop();
    li.stop();
    lo.stop();
  });
});
