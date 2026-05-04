// Unit tests for the pure halo state-machine and boundary helpers
// extracted from FoldNode. These guard the spec the user laid out:
//   1. halo turns on at first member fire
//   2. stays on continuously while members keep firing
//   3. turns off after `decayMs` of silence after the last fire
//   4. flash/glow only triggers on edges that cross the fold boundary
//      (member ↔ outside) — pure internal cascades don't animate

import { describe, expect, it, vi } from "vitest";
import {
  createFoldActivityTracker,
  isFoldBoundaryEmit,
} from "../src/webview/rf/fold-activity";

function makeFakeTimer() {
  let now = 0;
  type Pending = { at: number; fn: () => void; cancelled: boolean };
  const pending: Pending[] = [];
  let nextHandle = 1;
  const handles = new Map<number, Pending>();
  return {
    set: (fn: () => void, ms: number) => {
      const handle = nextHandle++;
      const entry = { at: now + ms, fn, cancelled: false };
      pending.push(entry);
      handles.set(handle, entry);
      return handle;
    },
    clear: (h: unknown) => {
      const entry = handles.get(h as number);
      if (entry) entry.cancelled = true;
    },
    advance(ms: number) {
      now += ms;
      // Fire any due, non-cancelled timers in chronological order.
      pending
        .filter((p) => !p.cancelled && p.at <= now)
        .sort((a, b) => a.at - b.at)
        .forEach((p) => {
          p.cancelled = true; // single-shot
          p.fn();
        });
    },
  };
}

describe("createFoldActivityTracker", () => {
  it("turns on at first fire", () => {
    const t = makeFakeTimer();
    const onChange = vi.fn();
    const tracker = createFoldActivityTracker(100, onChange, t);
    expect(tracker.isActive()).toBe(false);
    tracker.noteFire();
    expect(tracker.isActive()).toBe(true);
    expect(onChange).toHaveBeenCalledWith(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not re-emit on repeated fires while already active", () => {
    const t = makeFakeTimer();
    const onChange = vi.fn();
    const tracker = createFoldActivityTracker(100, onChange, t);
    tracker.noteFire();
    tracker.noteFire();
    tracker.noteFire();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(tracker.isActive()).toBe(true);
  });

  it("stays on while fires arrive within the decay window", () => {
    const t = makeFakeTimer();
    const onChange = vi.fn();
    const tracker = createFoldActivityTracker(100, onChange, t);
    tracker.noteFire();
    t.advance(60);
    tracker.noteFire(); // refresh: timer reset, should not expire at t=100
    t.advance(60); // total 120 since first fire, but only 60 since refresh
    expect(tracker.isActive()).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1); // only the initial true
  });

  it("turns off after decay window with no fires", () => {
    const t = makeFakeTimer();
    const onChange = vi.fn();
    const tracker = createFoldActivityTracker(100, onChange, t);
    tracker.noteFire();
    t.advance(99);
    expect(tracker.isActive()).toBe(true);
    t.advance(2); // crosses the 100ms threshold
    expect(tracker.isActive()).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it("can re-arm after going inactive", () => {
    const t = makeFakeTimer();
    const onChange = vi.fn();
    const tracker = createFoldActivityTracker(100, onChange, t);
    tracker.noteFire();
    t.advance(150);
    expect(tracker.isActive()).toBe(false);
    tracker.noteFire();
    expect(tracker.isActive()).toBe(true);
    // 4 transitions: on, off, on (3 onChange calls)
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([true, false, true]);
  });

  it("dispose cancels pending decay so no spurious off after unmount", () => {
    const t = makeFakeTimer();
    const onChange = vi.fn();
    const tracker = createFoldActivityTracker(100, onChange, t);
    tracker.noteFire();
    tracker.dispose();
    t.advance(500);
    expect(onChange).toHaveBeenCalledTimes(1); // only the initial true
  });
});

describe("isFoldBoundaryEmit", () => {
  const members = new Set(["a", "b", "c"]);
  it("true when emit enters the fold (outside → member)", () => {
    expect(isFoldBoundaryEmit(members, "x", "a")).toBe(true);
  });
  it("true when emit leaves the fold (member → outside)", () => {
    expect(isFoldBoundaryEmit(members, "b", "y")).toBe(true);
  });
  it("false for pure internal emit (member → member)", () => {
    expect(isFoldBoundaryEmit(members, "a", "b")).toBe(false);
  });
  it("false for pure external emit (outside → outside)", () => {
    expect(isFoldBoundaryEmit(members, "x", "y")).toBe(false);
  });
});
