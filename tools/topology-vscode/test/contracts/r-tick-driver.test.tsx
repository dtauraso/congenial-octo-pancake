// @vitest-environment happy-dom
//
// useTickDriver contract: walks nodes once per round, round close is
// event-driven on wire return-to-empty, ordinal tick advances on close,
// halt prevents auto-advance, step advances once even when halted.

import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { RefObject } from "react";
import { useTickDriver } from "../../src/webview/substrate-r/useTickDriver";
import type { WireHandle } from "../../src/webview/substrate-r/Wire";
import type { NodeHandle } from "../../src/webview/substrate-r/Node";
import type { Phase } from "../../src/webview/substrate-r/wire-phase";

function makeMockWire(): WireHandle & { __setPhase(p: Phase): void } {
  const listeners = new Set<(p: Phase) => void>();
  let phase: Phase = { kind: "empty" };
  return {
    load: vi.fn((value) => { phase = { kind: "loaded", value }; listeners.forEach((l) => l(phase)); }),
    take: vi.fn(() => {
      if (phase.kind === "loaded") {
        phase = { kind: "taken", value: phase.value };
        listeners.forEach((l) => l(phase));
      }
    }),
    ack: vi.fn(() => {
      if (phase.kind === "taken") {
        phase = { kind: "empty" };
        listeners.forEach((l) => l(phase));
      }
    }),
    get phase() { return phase; },
    subscribePhase(l) { listeners.add(l); return () => listeners.delete(l); },
    __setPhase(p) { phase = p; listeners.forEach((l) => l(p)); },
  };
}

function makeMockNode(onRun?: () => void): NodeHandle {
  return {
    run: vi.fn(() => onRun?.()),
    requestTake: vi.fn(),
  };
}

function ref<T>(v: T): RefObject<T | null> {
  return { current: v } as RefObject<T | null>;
}

describe("useTickDriver", () => {
  it("starts at tick 0, not halted, no in-flight round", () => {
    const { result } = renderHook(() =>
      useTickDriver({ nodeRefs: [], wireRefs: [] }),
    );
    expect(result.current.tick).toBe(0);
    expect(result.current.halted).toBe(false);
  });

  it("step walks every node's run() once", () => {
    const n1 = makeMockNode();
    const n2 = makeMockNode();
    const { result } = renderHook(() =>
      useTickDriver({
        nodeRefs: [ref(n1), ref(n2)],
        wireRefs: [],
      }),
    );
    act(() => { result.current.step(); });
    expect(n1.run).toHaveBeenCalledOnce();
    expect(n2.run).toHaveBeenCalledOnce();
  });

  it("round closes immediately and ticks advance when no wires load", () => {
    const n1 = makeMockNode();
    const { result } = renderHook(() =>
      useTickDriver({ nodeRefs: [ref(n1)], wireRefs: [] }),
    );
    act(() => {
      result.current.halt();
      result.current.step();
    });
    expect(result.current.tick).toBe(1);
  });

  it("round waits when a wire stays loaded; closes after cycle", () => {
    const w = makeMockWire();
    let didLoad = false;
    const n = makeMockNode(() => { if (!didLoad) { didLoad = true; w.load(42); } });
    const { result } = renderHook(() =>
      useTickDriver({ nodeRefs: [ref(n)], wireRefs: [ref(w)] }),
    );
    act(() => { result.current.halt(); result.current.step(); });
    expect(result.current.tick).toBe(0);
    expect(w.phase.kind).toBe("loaded");
    act(() => { w.take(); w.ack(); });
    expect(result.current.tick).toBe(1);
  });

  it("halt prevents auto-advance after round close", () => {
    const runs = vi.fn();
    const n = makeMockNode(runs);
    const { result } = renderHook(() =>
      useTickDriver({ nodeRefs: [ref(n)], wireRefs: [] }),
    );
    act(() => { result.current.halt(); result.current.step(); });
    expect(runs).toHaveBeenCalledTimes(1);
    expect(result.current.tick).toBe(1);
  });

  it("resume kicks off the next round when halted with empty wires", () => {
    const runs = vi.fn();
    const n = makeMockNode(runs);
    const { result } = renderHook(() =>
      useTickDriver({ nodeRefs: [ref(n)], wireRefs: [] }),
    );
    act(() => { result.current.halt(); result.current.step(); });
    const before = runs.mock.calls.length;
    act(() => { result.current.resume(); });
    expect(runs.mock.calls.length).toBeGreaterThan(before);
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
