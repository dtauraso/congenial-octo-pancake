import { describe, expect, it } from "vitest";
import { run } from "./_helpers";

describe("AndGate", () => {
  it("buffers one input without emitting", () => {
    const r = run("AndGate", "a", 1);
    expect(r.emissions).toEqual([]);
    expect(r.state.a).toBe(1);
  });

  it("emits 1 on out when both inputs are 1, then clears", () => {
    const after = run("AndGate", "a", 1).state;
    const r = run("AndGate", "b", 1, after);
    expect(r.emissions).toEqual([{ port: "out", value: 1 }]);
    expect(r.state.a).toBeUndefined();
    expect(r.state.b).toBeUndefined();
  });

  it("emits 0 on out when one input is 0", () => {
    const after = run("AndGate", "a", 0).state;
    const r = run("AndGate", "b", 1, after);
    expect(r.emissions).toEqual([{ port: "out", value: 0 }]);
  });
});
