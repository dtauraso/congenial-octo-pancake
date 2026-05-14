// @vitest-environment happy-dom
//
// useTickDriver contract: walks nodes once per round; round close is
// event-driven on every wire returning to empty (under the slot-in-
// node model the wire returns to empty on arrive, not on consume).
// halt prevents auto-advance; step advances even when halted.

import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import type { RefObject } from "react";
import { useTickDriver } from "../../src/webview/substrate-r/useTickDriver";
import type { WireHandle } from "../../src/webview/substrate-r/Wire";
import type { NodeHandle } from "../../src/webview/substrate-r/Node";
import type { Phase } from "../../src/webview/substrate-r/wire-phase";

function makeMockWire(): WireHandle & { __setPhase(p: Phase): void } {
  const listeners = new Set<(p: Phase) => void>();
  let phase: Phase = { kind: "empty" };
  const setPhase = (p: Phase) => { phase = p; listeners.forEach((l) => l(phase)); };
  return {
    load: vi.fn((value) => setPhase({ kind: "in-flight", value })),
    complete: vi.fn(() => { if (phase.kind === "in-flight") setPhase({ kind: "empty" }); }),
    get phase() { return phase; },
    get canAccept() { return phase.kind === "empty"; },
    subscribePhase(l) { listeners.add(l); return () => listeners.delete(l); },
    __setPhase: setPhase,
  };
}

function makeMockNode(onRun?: () => void): NodeHandle {
  return {
    run: vi.fn(() => onRun?.()),
    fill: vi.fn(),
    consume: vi.fn(() => undefined),
    slotPhase: vi.fn(() => "empty"),
    subscribeSlot: vi.fn(() => () => {}),
    requestConsume: vi.fn(),
  };
}

function ref<T>(v: T): RefObject<T | null> {
  return { current: v } as RefObject<T | null>;
}

// useTickDriver's fast-path schedules `requestAnimationFrame(advance)`
// after a cohort with no animating wires. The tests assert state
// synchronously inside act() and don't depend on that RAF firing —
// but if it does fire after happy-dom tears down between test files,
// React's scheduler tries to use `window` and crashes. Stub RAF to a
// no-op so no callback survives the test. cleanup() between tests
// unmounts each hook so refs/subscribers don't accumulate either.
let rafStub: { restore(): void };
beforeAll(() => {
  const orig = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = (() => 0) as typeof requestAnimationFrame;
  rafStub = { restore: () => { globalThis.requestAnimationFrame = orig; } };
});
afterAll(() => { rafStub.restore(); });
afterEach(() => { cleanup(); });

describe("useTickDriver", () => {
  it("starts at tick 0, not halted", () => {
    const { result } = renderHook(() => useTickDriver({ nodeRefs: [], wireRefs: [] }));
    expect(result.current.tick).toBe(0);
    expect(result.current.halted).toBe(false);
  });

  it("step walks every node's run() once", () => {
    const n1 = makeMockNode();
    const n2 = makeMockNode();
    const { result } = renderHook(() =>
      useTickDriver({ nodeRefs: [ref(n1), ref(n2)], wireRefs: [] }),
    );
    act(() => { result.current.step(); });
    expect(n1.run).toHaveBeenCalledOnce();
    expect(n2.run).toHaveBeenCalledOnce();
  });

  it("round closes immediately and tick advances when no wires load", () => {
    const n1 = makeMockNode();
    const { result } = renderHook(() => useTickDriver({ nodeRefs: [ref(n1)], wireRefs: [] }));
    act(() => { result.current.halt(); result.current.step(); });
    expect(result.current.tick).toBe(1);
  });

  it("round waits while a wire is in-flight; closes when it arrives back to empty", () => {
    const w = makeMockWire();
    let didLoad = false;
    const n = makeMockNode(() => { if (!didLoad) { didLoad = true; w.load(42); } });
    const { result } = renderHook(() =>
      useTickDriver({ nodeRefs: [ref(n)], wireRefs: [ref(w)] }),
    );
    act(() => { result.current.halt(); result.current.step(); });
    expect(result.current.tick).toBe(0);
    expect(w.phase.kind).toBe("in-flight");
    act(() => { w.complete(); });
    expect(result.current.tick).toBe(1);
  });

  it("halt prevents auto-advance after round close", () => {
    const runs = vi.fn();
    const n = makeMockNode(runs);
    const { result } = renderHook(() => useTickDriver({ nodeRefs: [ref(n)], wireRefs: [] }));
    act(() => { result.current.halt(); result.current.step(); });
    expect(runs).toHaveBeenCalledTimes(1);
    expect(result.current.tick).toBe(1);
  });

  it("resume kicks off the next round when halted with empty wires", () => {
    const runs = vi.fn();
    const n = makeMockNode(runs);
    const { result } = renderHook(() => useTickDriver({ nodeRefs: [ref(n)], wireRefs: [] }));
    act(() => { result.current.halt(); result.current.step(); });
    const before = runs.mock.calls.length;
    act(() => { result.current.resume(); });
    expect(runs.mock.calls.length).toBeGreaterThan(before);
  });

  it("halt() flips pauseAxis.paused; resume() flips it back", () => {
    const { result } = renderHook(() => useTickDriver({ nodeRefs: [], wireRefs: [] }));
    expect(result.current.pauseAxis.paused).toBe(false);
    act(() => { result.current.halt(); });
    expect(result.current.pauseAxis.paused).toBe(true);
    act(() => { result.current.resume(); });
    expect(result.current.pauseAxis.paused).toBe(false);
  });

  it("step() does not clear pauseAxis when paused", () => {
    const n = makeMockNode();
    const { result } = renderHook(() => useTickDriver({ nodeRefs: [ref(n)], wireRefs: [] }));
    act(() => { result.current.halt(); result.current.step(); });
    expect(result.current.pauseAxis.paused).toBe(true);
    expect(result.current.tick).toBe(1);
  });

  it("step is a no-op while a round is in flight", () => {
    const w = makeMockWire();
    let didLoad = false;
    const n = makeMockNode(() => { if (!didLoad) { didLoad = true; w.load(1); } });
    const { result } = renderHook(() =>
      useTickDriver({ nodeRefs: [ref(n)], wireRefs: [ref(w)] }),
    );
    act(() => { result.current.halt(); result.current.step(); });
    expect(result.current.tick).toBe(0);
    const before = (n.run as ReturnType<typeof vi.fn>).mock.calls.length;
    act(() => { result.current.step(); });
    expect((n.run as ReturnType<typeof vi.fn>).mock.calls.length).toBe(before);
  });
});
