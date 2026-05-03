// Phase 7 Chunk 2 — drift detection tests.

import { describe, expect, it } from "vitest";
import { detectDrift, summarizeDrift } from "../src/sim/drift";
import type { TraceEvent } from "../src/sim/trace";

const recv = (s: number, n: string, p: string, v: number | string): TraceEvent =>
  ({ step: s, kind: "recv", node: n, port: p, value: v });
const fire = (s: number, n: string): TraceEvent => ({ step: s, kind: "fire", node: n });
const send = (s: number, e: string, v: number | string): TraceEvent =>
  ({ step: s, kind: "send", edge: e, value: v });

describe("drift", () => {
  it("equal sequences match", () => {
    const a: TraceEvent[] = [recv(0, "n1", "in", 1), fire(1, "n1"), send(2, "e1", 1)];
    expect(detectDrift(a, a)).toEqual({ kind: "match", length: 3 });
  });

  it("ignores step (drift compares by position, not by step value)", () => {
    const a: TraceEvent[] = [recv(0, "n1", "in", 1)];
    const b: TraceEvent[] = [recv(99, "n1", "in", 1)];
    expect(detectDrift(a, b).kind).toBe("match");
  });

  it("detects value divergence", () => {
    const a: TraceEvent[] = [recv(0, "n1", "in", 1)];
    const b: TraceEvent[] = [recv(0, "n1", "in", 2)];
    const r = detectDrift(a, b);
    expect(r.kind).toBe("diverge");
    if (r.kind === "diverge") expect(r.index).toBe(0);
  });

  it("detects node divergence", () => {
    const a: TraceEvent[] = [recv(0, "n1", "in", 1), fire(1, "n1")];
    const b: TraceEvent[] = [recv(0, "n1", "in", 1), fire(1, "n2")];
    const r = detectDrift(a, b);
    expect(r.kind).toBe("diverge");
    if (r.kind === "diverge") expect(r.index).toBe(1);
  });

  it("detects edge divergence on send", () => {
    const a: TraceEvent[] = [send(0, "e1", 5)];
    const b: TraceEvent[] = [send(0, "e2", 5)];
    expect(detectDrift(a, b).kind).toBe("diverge");
  });

  it("kind mismatch counts as divergence", () => {
    const a: TraceEvent[] = [fire(0, "n1")];
    const b: TraceEvent[] = [recv(0, "n1", "in", 1)];
    expect(detectDrift(a, b).kind).toBe("diverge");
  });

  it("length mismatch with matching prefix", () => {
    const a: TraceEvent[] = [recv(0, "n1", "in", 1), fire(1, "n1")];
    const b: TraceEvent[] = [recv(0, "n1", "in", 1)];
    const r = detectDrift(a, b);
    expect(r).toEqual({ kind: "length-mismatch", commonPrefix: 1, expectedLen: 2, gotLen: 1 });
  });

  it("summarizeDrift produces single-line output", () => {
    expect(summarizeDrift({ kind: "match", length: 6 })).toBe("no drift through 6 events");
    expect(
      summarizeDrift({
        kind: "diverge",
        index: 2,
        expected: fire(2, "a"),
        got: fire(2, "b"),
      }),
    ).toMatch(/drift at index 2.*fire:a.*fire:b/);
    expect(
      summarizeDrift({ kind: "length-mismatch", commonPrefix: 3, expectedLen: 5, gotLen: 3 }),
    ).toMatch(/length mismatch.*5.*3/);
  });
});
