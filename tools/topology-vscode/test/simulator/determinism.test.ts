// Two independent runs of the same fixture must yield identical
// history + state + tick + cycle. Pins the (readyAt, id) tie-break.

import { describe, expect, it } from "vitest";
import { runToQuiescent } from "../../src/sim/simulator";
import { fixtureC } from "./_helpers";

describe("simulator: determinism", () => {
  it("two independent runs produce identical history + state", () => {
    const a = runToQuiescent(fixtureC);
    const b = runToQuiescent(fixtureC);
    expect(a.history).toEqual(b.history);
    expect(a.state).toEqual(b.state);
    expect(a.tick).toBe(b.tick);
    expect(a.cycle).toBe(b.cycle);
  });
});
