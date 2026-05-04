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

describe("createFoldActivityTracker", () => {
  it("turns on at first fire", () => {
    const onChange = vi.fn();
    const tracker = createFoldActivityTracker(100, onChange);
    expect(tracker.isActive()).toBe(false);
    tracker.noteFire(0);
    expect(tracker.isActive()).toBe(true);
    expect(onChange).toHaveBeenCalledWith(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not re-emit on repeated fires while already active", () => {
    const onChange = vi.fn();
    const tracker = createFoldActivityTracker(100, onChange);
    tracker.noteFire(0);
    tracker.noteFire(10);
    tracker.noteFire(20);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(tracker.isActive()).toBe(true);
  });

  it("stays on while fires arrive within the decay window", () => {
    const onChange = vi.fn();
    const tracker = createFoldActivityTracker(100, onChange);
    tracker.noteFire(0);
    tracker.tick(60);
    tracker.noteFire(60); // refresh
    tracker.tick(120); // 60ms since refresh — still active
    expect(tracker.isActive()).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("turns off after decay window with no fires", () => {
    const onChange = vi.fn();
    const tracker = createFoldActivityTracker(100, onChange);
    tracker.noteFire(0);
    tracker.tick(99);
    expect(tracker.isActive()).toBe(true);
    tracker.tick(101); // crosses 100ms threshold
    expect(tracker.isActive()).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it("can re-arm after going inactive", () => {
    const onChange = vi.fn();
    const tracker = createFoldActivityTracker(100, onChange);
    tracker.noteFire(0);
    tracker.tick(150);
    expect(tracker.isActive()).toBe(false);
    tracker.noteFire(150);
    expect(tracker.isActive()).toBe(true);
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([true, false, true]);
  });

  it("tick is a no-op when inactive (no spurious off events)", () => {
    const onChange = vi.fn();
    const tracker = createFoldActivityTracker(100, onChange);
    tracker.tick(0);
    tracker.tick(500);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("freezes when sim time freezes (the play/pause guarantee)", () => {
    // Sim time stops advancing while the runner is paused, so calling
    // tick() repeatedly with the same `now` must not flip the halo off
    // even past the decay window — this is the property that replaces
    // the old pause()/resume() bookkeeping.
    const onChange = vi.fn();
    const tracker = createFoldActivityTracker(100, onChange);
    tracker.noteFire(0);
    tracker.tick(40);
    // Pretend the runner pauses here. Sim time stays at 40 forever.
    for (let i = 0; i < 50; i++) tracker.tick(40);
    expect(tracker.isActive()).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
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
