import { describe, expect, it } from "vitest";
import { run } from "./_helpers";

describe("InhibitRightGate", () => {
  it("emits 1 only when left=1 and right=0", () => {
    const after = run("InhibitRightGate", "left", 1).state;
    const r = run("InhibitRightGate", "right", 0, after);
    expect(r.emissions).toEqual([{ port: "out", value: 1 }]);
  });

  it("emits 0 for all other combinations", () => {
    for (const [l, rv] of [[1, 1], [0, 0], [0, 1]] as const) {
      const after = run("InhibitRightGate", "left", l).state;
      const r = run("InhibitRightGate", "right", rv, after);
      expect(r.emissions).toEqual([{ port: "out", value: 0 }]);
    }
  });
});
