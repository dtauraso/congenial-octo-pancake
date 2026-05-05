import { describe, expect, it } from "vitest";
import { run } from "./_helpers";

describe("Partition", () => {
  it("transitions NotInit → Growing on first 1, emits out=1", () => {
    const r = run("Partition", "in", 1);
    expect(r.state.phase).toBe(1);
    expect(r.emissions).toEqual([{ port: "out", value: 1 }]);
  });

  it("transitions Growing → Stopped on second 1, emits out=0", () => {
    const r = run("Partition", "in", 1, { phase: 1 });
    expect(r.state.phase).toBe(2);
    expect(r.emissions).toEqual([{ port: "out", value: 0 }]);
  });

  it("ignores zero values", () => {
    const r = run("Partition", "in", 0, { phase: 1 });
    expect(r.emissions).toEqual([]);
    expect(r.state.phase).toBe(1);
  });

  // Phase 6 Chunk A: each phase advance writes dx into state so the
  // renderer can tween a slide.
  it("writes dx motion on each phase advance (props.slidePx)", () => {
    const r1 = run("Partition", "in", 1, {}, { slidePx: 30 });
    expect(r1.state.dx).toBe(30);
    const r2 = run("Partition", "in", 1, r1.state, { slidePx: 30 });
    expect(r2.state.dx).toBe(60);
  });

  it("does not advance dx when ignoring a value (phase Stopped)", () => {
    const r = run("Partition", "in", 1, { phase: 2, dx: 60 }, { slidePx: 30 });
    expect(r.state.dx).toBe(60);
  });

  // Phase 6 Chunk B: paused-drag writes props.slideDy alongside slidePx.
  it("writes dy motion on each phase advance (props.slideDy)", () => {
    const r1 = run("Partition", "in", 1, {}, { slidePx: 30, slideDy: -10 });
    expect(r1.state.dx).toBe(30);
    expect(r1.state.dy).toBe(-10);
    const r2 = run(
      "Partition",
      "in",
      1,
      r1.state,
      { slidePx: 30, slideDy: -10 },
    );
    expect(r2.state.dy).toBe(-20);
  });
});
