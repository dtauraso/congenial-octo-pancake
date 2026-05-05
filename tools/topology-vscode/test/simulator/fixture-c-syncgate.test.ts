// Fixture C: SyncGate releases a DetectorLatch — exercise gating.

import { describe, expect, it } from "vitest";
import { runToQuiescent } from "../../src/sim/simulator";
import { fixtureC } from "./_helpers";

describe("simulator: SyncGate-released DetectorLatch (fixture C)", () => {
  it("latch fires only after SyncGate releases", () => {
    const final = runToQuiescent(fixtureC);
    const dlReleaseFire = final.history.find(
      (h) => h.nodeId === "dl" && h.inputPort === "release",
    );
    const dlInFire = final.history.find(
      (h) => h.nodeId === "dl" && h.inputPort === "in",
    );
    const sgFire = final.history.find(
      (h) => h.nodeId === "sg" && h.emissions.some((e) => e.port === "release"),
    );
    expect(dlInFire).toBeDefined();
    expect(sgFire).toBeDefined();
    expect(dlReleaseFire).toBeDefined();
    // Release must fire after SyncGate emits.
    expect(sgFire!.ord).toBeLessThan(dlReleaseFire!.ord);
    // Latch out must carry the source value.
    const out = dlReleaseFire!.emissions.find((e) => e.port === "out");
    expect(out?.value).toBe(99);
  });
});
