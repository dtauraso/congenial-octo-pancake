// Mirrors runner.ts's N1' concurrent-edge self-pacer: on each arrival
// at the target, re-enqueue the same value at world.tick+1. Pins that
// pulses arrive in the order they were re-fired and the queue stays
// sorted by (readyAt, id) after every re-enqueue.

import { describe, expect, it } from "vitest";
import { enqueueEmission, initWorld, step } from "../../src/sim/simulator";
import type { Spec } from "../../src/schema";
import { edge } from "./_helpers";

const spec: Spec = {
  nodes: [
    { id: "in", type: "Input", x: 0, y: 0 },
    { id: "ci", type: "ChainInhibitor", x: 1, y: 0 },
  ],
  edges: [edge("inToCi", "in", "out", "ci", "in", "chain")],
  timing: { seed: [{ nodeId: "in", outPort: "out", value: 1, atTick: 0 }] },
};

describe("simulator: self-pacer under backlog (audit row #3)", () => {
  it("re-fires preserve FIFO arrival order at the target", () => {
    let w = initWorld(spec);
    const arrivals: number[] = [];
    let nextValue = 1;
    for (let i = 0; i < 10; i++) {
      if (w.queue.length === 0) break;
      const before = w.history.length;
      w = step(spec, w);
      const fresh = w.history.slice(before);
      for (const rec of fresh) {
        if (rec.nodeId === "ci") {
          arrivals.push(rec.inputValue as number);
          nextValue += 1;
          enqueueEmission(spec, w, "in", "out", nextValue, w.tick + 1);
        }
      }
    }
    expect(arrivals.length).toBeGreaterThan(3);
    for (let i = 1; i < arrivals.length; i++) {
      expect(arrivals[i]).toBe(arrivals[i - 1] + 1);
    }
  });

  it("queue stays sorted by (readyAt, id) after every re-enqueue", () => {
    let w = initWorld(spec);
    for (let i = 0; i < 20; i++) {
      if (w.queue.length === 0) break;
      w = step(spec, w);
      enqueueEmission(spec, w, "in", "out", 1, w.tick + 1);
      for (let j = 1; j < w.queue.length; j++) {
        const a = w.queue[j - 1];
        const b = w.queue[j];
        const ok =
          a.readyAt < b.readyAt ||
          (a.readyAt === b.readyAt && a.id < b.id);
        expect(ok).toBe(true);
      }
    }
  });
});
