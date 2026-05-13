// Cohort gate contract: release / isReleased / subscribe semantics.

import { describe, it, expect, vi } from "vitest";
import { createCohortGate } from "../../src/webview/substrate-r/cohort-gate";

describe("createCohortGate", () => {
  it("starts with no cohorts released", () => {
    const g = createCohortGate();
    expect(g.isReleased(0)).toBe(false);
    expect(g.isReleased(1)).toBe(false);
  });

  it("release(N) marks N released; other cohorts remain parked", () => {
    const g = createCohortGate();
    g.release(2);
    expect(g.isReleased(2)).toBe(true);
    expect(g.isReleased(1)).toBe(false);
    expect(g.isReleased(3)).toBe(false);
  });

  it("subscribe(N, cb) fires on release(N), not on other releases", () => {
    const g = createCohortGate();
    const cb0 = vi.fn();
    const cb1 = vi.fn();
    g.subscribe(0, cb0);
    g.subscribe(1, cb1);
    g.release(1);
    expect(cb0).not.toHaveBeenCalled();
    expect(cb1).toHaveBeenCalledOnce();
  });

  it("release is idempotent (no double-fire)", () => {
    const g = createCohortGate();
    const cb = vi.fn();
    g.subscribe(0, cb);
    g.release(0);
    g.release(0);
    expect(cb).toHaveBeenCalledOnce();
  });

  it("subscribing after release does NOT immediately fire (caller polls isReleased)", () => {
    const g = createCohortGate();
    g.release(0);
    const cb = vi.fn();
    g.subscribe(0, cb);
    expect(cb).not.toHaveBeenCalled();
  });

  it("unsubscribe prevents the callback from firing", () => {
    const g = createCohortGate();
    const cb = vi.fn();
    const unsub = g.subscribe(0, cb);
    unsub();
    g.release(0);
    expect(cb).not.toHaveBeenCalled();
  });
});
