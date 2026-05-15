// @vitest-environment happy-dom
//
// useHaltControl contract: halt/resume flip halted state and pauseAxis.
// No tick, no step, no walker.

import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useHaltControl } from "../../src/webview/substrate-r/useHaltControl";

afterEach(() => { cleanup(); });

describe("useHaltControl", () => {
  it("starts not halted, pauseAxis not paused", () => {
    const { result } = renderHook(() => useHaltControl());
    expect(result.current.halted).toBe(false);
    expect(result.current.pauseAxis.paused).toBe(false);
  });

  it("halt() sets halted and pauses axis", () => {
    const { result } = renderHook(() => useHaltControl());
    act(() => { result.current.halt(); });
    expect(result.current.halted).toBe(true);
    expect(result.current.pauseAxis.paused).toBe(true);
  });

  it("resume() clears halted and unpauses axis", () => {
    const { result } = renderHook(() => useHaltControl());
    act(() => { result.current.halt(); });
    act(() => { result.current.resume(); });
    expect(result.current.halted).toBe(false);
    expect(result.current.pauseAxis.paused).toBe(false);
  });
});
