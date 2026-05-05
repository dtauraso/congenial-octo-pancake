// @vitest-environment happy-dom
//
// Contract C1 (docs/planning/visual-editor/contracts.md), Tier-2 half:
// useHostMessages installs the host-message router exactly once per
// mount, regardless of render count, and the cleanup runs on unmount.
//
// The Tier-1 sibling (`ready-once.test.ts`) pins the router itself —
// one install call → one ready post. This test pins the hook layer:
// stable AppCtx + CompareSetters refs must keep the install effect's
// deps stable so React's effect runs once. A regression where deps
// drift to fresh objects per render would re-install on every render
// and post `ready` repeatedly. We mock the router so the assertion is
// "install was called once," independent of the router's internals.

import { renderHook } from "@testing-library/react";
import type { MutableRefObject } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/webview/save", () => ({
  vscode: { postMessage: vi.fn(), setState: vi.fn(), getState: vi.fn() },
}));

const installSpy = vi.fn(() => vi.fn());
vi.mock("../../src/webview/rf/app/_install-host-message-router", () => ({
  installHostMessageRouter: (...args: unknown[]) => installSpy(...args),
}));

import { useHostMessages } from "../../src/webview/rf/app/_use-host-messages";
import type { AppCtx } from "../../src/webview/rf/app/_ctx";

function makeCtx(): AppCtx {
  const ref = <T,>(v: T): MutableRefObject<T> => ({ current: v });
  return {
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    lastSpec: ref(null),
    reconnectOk: ref(true),
    paneRef: ref(null),
    flashIdsRef: ref(new Set<string>()),
    flashTimerRef: ref(null),
    compareModeRef: ref("A-live"),
    isReadOnlyView: () => false,
    rebuildFlow: vi.fn(),
    rf: {} as AppCtx["rf"],
  };
}

function makeCompare() {
  return {
    setComparisonSpec: vi.fn(),
    setComparisonLabel: vi.fn(),
    setCompareMode: vi.fn(),
    setCompareError: vi.fn(),
  };
}

describe("contract C1 (Tier-2): useHostMessages installs router once per mount", () => {
  it("installs exactly once on mount", () => {
    installSpy.mockClear();
    const ctx = makeCtx();
    const c = makeCompare();
    renderHook(() => useHostMessages(ctx, c));
    expect(installSpy).toHaveBeenCalledTimes(1);
  });

  it("does not re-install when the hook rerenders with stable refs", () => {
    installSpy.mockClear();
    const ctx = makeCtx();
    const c = makeCompare();
    const { rerender } = renderHook(() => useHostMessages(ctx, c));
    rerender();
    rerender();
    rerender();
    expect(installSpy).toHaveBeenCalledTimes(1);
  });

  it("invokes the router cleanup on unmount", () => {
    const cleanup = vi.fn();
    installSpy.mockClear();
    installSpy.mockImplementationOnce(() => cleanup);
    const ctx = makeCtx();
    const c = makeCompare();
    const { unmount } = renderHook(() => useHostMessages(ctx, c));
    expect(cleanup).not.toHaveBeenCalled();
    unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
