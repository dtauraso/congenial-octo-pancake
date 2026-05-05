import { describe, expect, it } from "vitest";
import { run } from "./_helpers";

describe("ChainInhibitor", () => {
  it("emits held on inhibitOut/out, value on readNew, ack=1; updates held", () => {
    const r = run("ChainInhibitor", "in", 7, { held: 3 });
    expect(r.state.held).toBe(7);
    expect(r.emissions).toEqual([
      { port: "inhibitOut", value: 3 },
      { port: "readNew", value: 7 },
      { port: "out", value: 3 },
      { port: "ack", value: 1 },
    ]);
  });

  it("treats missing held as 0 on first arrival", () => {
    const r = run("ChainInhibitor", "in", 5);
    expect(r.state.held).toBe(5);
    expect(r.emissions.find((e) => e.port === "out")?.value).toBe(0);
  });
});
