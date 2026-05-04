// Halo predicate + boundary helper. Halo = "simulator queue contains
// pending events for at least one member" — a state projection of the
// queue, not an event-stream reduction.

import { describe, expect, it } from "vitest";
import {
  foldHasPendingEvents,
  firstPendingMember,
  isFoldBoundaryEmit,
} from "../src/webview/rf/fold-activity";
import type { World, SimEvent } from "../src/sim/simulator";

function w(queue: SimEvent[]): World {
  return {
    tick: 0,
    cycle: 0,
    wasQuiescent: true,
    queue,
    state: {},
    history: [],
    inFlight: new Map(),
    deferred: [],
  } as unknown as World;
}

function ev(toNodeId: string, id = 1): SimEvent {
  return { id, readyAt: 0, edgeId: null, fromNodeId: "x", fromPort: "out", toNodeId, toPort: "in", value: 1 };
}

describe("foldHasPendingEvents", () => {
  it("false when world is null", () => {
    expect(foldHasPendingEvents(["a"], null)).toBe(false);
  });

  it("false when queue has no events for any member", () => {
    expect(foldHasPendingEvents(["a", "b"], w([ev("other")]))).toBe(false);
  });

  it("true when one queued event targets a member", () => {
    expect(foldHasPendingEvents(["a", "b"], w([ev("other"), ev("a")]))).toBe(true);
  });

  it("false on empty queue", () => {
    expect(foldHasPendingEvents(["a"], w([]))).toBe(false);
  });

  it("works with large member lists (Set fast path)", () => {
    const members = Array.from({ length: 20 }, (_, i) => `m${i}`);
    expect(foldHasPendingEvents(members, w([ev("m17")]))).toBe(true);
    expect(foldHasPendingEvents(members, w([ev("nope")]))).toBe(false);
  });
});

describe("firstPendingMember", () => {
  it("null when nothing pending for members", () => {
    expect(firstPendingMember(["a"], w([ev("other")]))).toBeNull();
  });

  it("returns the toNodeId of the first matching queue entry", () => {
    expect(firstPendingMember(["a", "b"], w([ev("b", 1), ev("a", 2)]))).toBe("b");
  });
});

describe("isFoldBoundaryEmit", () => {
  const members = new Set(["a", "b", "c"]);
  it("true outside → member", () => { expect(isFoldBoundaryEmit(members, "x", "a")).toBe(true); });
  it("true member → outside", () => { expect(isFoldBoundaryEmit(members, "b", "y")).toBe(true); });
  it("false member → member", () => { expect(isFoldBoundaryEmit(members, "a", "b")).toBe(false); });
  it("false outside → outside", () => { expect(isFoldBoundaryEmit(members, "x", "y")).toBe(false); });
});
