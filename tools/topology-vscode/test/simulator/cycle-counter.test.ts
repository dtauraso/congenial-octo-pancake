// Cycle counter rules: (ii-a) increment per quiescent drain when no
// cycleAnchor; (ii-b) increment per handler invocation on the named
// anchor when cycleAnchor is set. Empty-queue step() is a no-op.

import { describe, expect, it } from "vitest";
import { initWorld, runToQuiescent, step } from "../../src/sim/simulator";
import type { Spec } from "../../src/schema";
import { fixtureB } from "./_helpers";

describe("simulator: cycle counter", () => {
  it("(ii-a) increments cycle once per quiescent drain", () => {
    const final = runToQuiescent(fixtureB);
    expect(final.cycle).toBe(1);
  });

  it("(ii-b) cycleAnchor counts every handler invocation on the anchor node", () => {
    const spec: Spec = { ...fixtureB, cycleAnchor: "and" };
    const final = runToQuiescent(spec);
    // AndGate's handler runs twice (once per input port — buffer on
    // first arrival, emit on second). The cycle counter ticks per
    // handler call, not per emission. Topologies that want
    // emission-counting semantics should anchor on a downstream node
    // whose handler runs exactly once per anchor cycle.
    expect(final.cycle).toBe(2);
  });

  it("step() on an empty queue is a no-op", () => {
    const w0 = initWorld({ ...fixtureB, timing: { steps: [], seed: [] } });
    const w1 = step(fixtureB, w0);
    expect(w1.queue).toEqual([]);
    expect(w1.history).toEqual([]);
    expect(w1.cycle).toBe(0);
  });
});
