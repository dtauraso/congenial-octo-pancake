import { describe, expect, it } from "vitest";
import { run } from "./_helpers";

describe("ReadLatch", () => {
  it("buffers `in` silently", () => {
    const r = run("ReadLatch", "in", 42);
    expect(r.emissions).toEqual([]);
    expect(r.state.held).toBe(42);
  });

  it("ignores `release` if nothing is held", () => {
    const r = run("ReadLatch", "release", 1);
    expect(r.emissions).toEqual([]);
  });

  it("emits out=held + ack=1 on release, then clears held", () => {
    const after = run("ReadLatch", "in", 9).state;
    const r = run("ReadLatch", "release", 1, after);
    expect(r.emissions).toEqual([
      { port: "out", value: 9 },
      { port: "ack", value: 1 },
    ]);
    expect(r.state.held).toBeUndefined();
  });
});
