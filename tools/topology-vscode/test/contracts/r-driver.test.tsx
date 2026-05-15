// @vitest-environment happy-dom
//
// useDriver contract: halt/resume flip halted state and pauseAxis.
// No tick, no step, no walker.

import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useDriver } from "../../src/webview/substrate-r/useDriver";

afterEach(() => { cleanup(); });

describe("useDriver", () => {
  it("starts not halted, pauseAxis not paused", () => {
    const { result } = renderHook(() => useDriver());
    expect(result.current.halted).toBe(false);
    expect(result.current.pauseAxis.paused).toBe(false);
  });

  it("halt() sets halted and pauses axis", () => {
    const { result } = renderHook(() => useDriver());
    act(() => { result.current.halt(); });
    expect(result.current.halted).toBe(true);
    expect(result.current.pauseAxis.paused).toBe(true);
  });

  it("resume() clears halted and unpauses axis", () => {
    const { result } = renderHook(() => useDriver());
    act(() => { result.current.halt(); });
    act(() => { result.current.resume(); });
    expect(result.current.halted).toBe(false);
    expect(result.current.pauseAxis.paused).toBe(false);
  });
});
