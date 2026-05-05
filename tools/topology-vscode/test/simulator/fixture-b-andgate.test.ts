// Fixture B: AndGate join — both inputs ignite simultaneously.

import { describe, expect, it } from "vitest";
import { runToQuiescent } from "../../src/sim/simulator";
import type { Spec } from "../../src/schema";
import { fixtureB } from "./_helpers";

describe("simulator: AndGate join (fixture B)", () => {
  it("fires AndGate.out=1 when both inputs are 1", () => {
    const final = runToQuiescent(fixtureB);
    const andFire = final.history.find(
      (h) => h.nodeId === "and" && h.emissions.some((e) => e.port === "out"),
    );
    expect(andFire?.emissions).toEqual([{ port: "out", value: 1 }]);
  });

  it("fires AndGate.out=0 when only one input is 1", () => {
    const spec: Spec = {
      ...fixtureB,
      timing: {
        steps: [],
        seed: [
          { nodeId: "srcA", outPort: "out", value: 1, atTick: 0 },
          { nodeId: "srcB", outPort: "out", value: 0, atTick: 0 },
        ],
      },
    };
    const final = runToQuiescent(spec);
    const andFire = final.history.find(
      (h) => h.nodeId === "and" && h.emissions.some((e) => e.port === "out"),
    );
    expect(andFire?.emissions).toEqual([{ port: "out", value: 0 }]);
  });
});
