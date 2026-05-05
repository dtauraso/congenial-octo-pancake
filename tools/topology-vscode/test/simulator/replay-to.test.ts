// F1 deterministic replay: replayTo(spec, c) returns the same world
// runToQuiescent produces when the spec settles at exactly cycle c.

import { describe, expect, it } from "vitest";
import { replayTo, runToQuiescent } from "../../src/sim/simulator";
import { fixtureB } from "./_helpers";

describe("simulator: replayTo", () => {
  it("fast-forwards to the requested cycle deterministically", () => {
    // Two pulses through fixture B → cycle increments to 1 then queue
    // empty. Asking for cycle 1 should return the same world that
    // runToQuiescent produces.
    const replayed = replayTo(fixtureB, 1);
    const direct = runToQuiescent(fixtureB);
    expect(replayed.history).toEqual(direct.history);
    expect(replayed.cycle).toBe(1);
  });
});
