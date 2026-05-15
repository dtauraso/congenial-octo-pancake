// Shared harness utilities for integration test suite.

import { act } from "@testing-library/react";
import { vi } from "vitest";
import type { TopologyRootHandle } from "../../src/webview/substrate-r/TopologyRoot";
import type { RefObject } from "react";

// SVG polyfill for happy-dom.
export function patchSVG(): void {
  if (!("getPointAtLength" in SVGPathElement.prototype)) {
    Object.defineProperty(SVGPathElement.prototype, "getPointAtLength", {
      value: () => ({ x: 0, y: 0 }), configurable: true,
    });
  }
}

/**
 * Advance timers one RAF-equivalent tick.
 * Each call propagates one wire hop.
 */
export function flushRaf(): void {
  act(() => { vi.advanceTimersByTime(50); });
}

/**
 * Advance timers until node slot phases reach fixpoint or maxRounds exceeded.
 * Fixpoint: two consecutive timer advances produce no new postLog calls.
 *
 * Requires postLog to be mocked so call-count is observable.
 * Pass a getter for the current mock call count.
 */
export function flushRound(
  getCallCount: () => number,
  maxRounds = 10,
): void {
  let prev = -1;
  for (let i = 0; i < maxRounds; i++) {
    act(() => { vi.advanceTimersByTime(50); });
    const current = getCallCount();
    if (current === prev) return;
    prev = current;
  }
  throw new Error("flushRound: did not reach fixpoint within maxRounds");
}

/**
 * Flush until quiet using ref-based slot phase snapshot.
 * Advances timers; checks all named node ids for slot phase changes.
 */
export function flushUntilQuiet(
  ref: RefObject<TopologyRootHandle | null>,
  nodeIds: string[],
  slotIds: string[][],
  maxRounds = 10,
): void {
  let prev = "";
  for (let i = 0; i < maxRounds; i++) {
    act(() => { vi.advanceTimersByTime(50); });
    const snap = nodeIds.map((nid, ni) => {
      const h = ref.current?.node(nid);
      return slotIds[ni].map((s) => h?.slotPhase(s) ?? "?").join(",");
    }).join("|");
    if (snap === prev) return;
    prev = snap;
  }
  throw new Error("flushRound: did not reach fixpoint within maxRounds");
}

export interface TraceCapture {
  fired(label: string, nodeId: string): boolean;
  callCount(): number;
  allLabels(): string[];
}

/**
 * Build a TraceCapture from a vitest mock function reference.
 * Each test file must call vi.mock("...log/post") and pass vi.mocked(postLog).
 */
export function makeCapture(
  getMock: () => { mock: { calls: Array<[string, Record<string, unknown>?]> } },
): TraceCapture {
  return {
    fired(label, nodeId) {
      return getMock().mock.calls.some(
        ([lbl, data]) => lbl === label && data?.["node"] === nodeId,
      );
    },
    callCount() { return getMock().mock.calls.length; },
    allLabels() { return getMock().mock.calls.map(([lbl]) => lbl); },
  };
}
