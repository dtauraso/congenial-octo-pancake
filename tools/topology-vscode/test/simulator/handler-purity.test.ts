// Handler purity: running runToQuiescent on a fixture must not mutate
// the spec or any earlier world snapshot.

import { describe, expect, it } from "vitest";
import { initWorld, runToQuiescent } from "../../src/sim/simulator";
import { fixtureB } from "./_helpers";

describe("simulator: handler purity", () => {
  it("does not mutate the spec or earlier worlds", () => {
    const w0 = initWorld(fixtureB);
    const snapQ = w0.queue.length;
    const snapState = JSON.stringify(w0.state);
    runToQuiescent(fixtureB);
    expect(w0.queue.length).toBe(snapQ);
    expect(JSON.stringify(w0.state)).toBe(snapState);
  });
});
