// Contract C1 (docs/planning/visual-editor/contracts.md):
// useHostMessages posts {type:"ready"} exactly once per mount, regardless
// of render count. The hook delegates to installHostMessageRouter; this
// test pins the router-level invariant: one install call → one ready
// message, even if many incoming host messages are dispatched afterward.
//
// The hook-layer "exactly one install per mount" half of the invariant
// is enforced by inspection — useHostMessages depends on stable refs in
// AppCtx and CompareSetters, so the install effect runs once. A Tier-2
// (jsdom) test would catch a regression where deps drift back to fresh
// objects per render. Until that substrate lands, this Tier-1 test pins
// the router half.

import { describe, expect, it, vi } from "vitest";
import { installHostMessageRouter } from "../../src/webview/rf/app/_install-host-message-router";

describe("contract C1: ready-once", () => {
  it("posts {type:'ready'} exactly once per install call", () => {
    const postMessage = vi.fn();
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    const handlers = {
      load: vi.fn(),
      compareLoad: vi.fn(),
      compareError: vi.fn(),
      viewLoad: vi.fn(),
    };

    installHostMessageRouter(
      { addEventListener, removeEventListener, postMessage },
      handlers,
    );

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({ type: "ready" });
  });

  it("does not post additional ready messages when host messages are dispatched", () => {
    const postMessage = vi.fn();
    let captured: ((e: MessageEvent<unknown>) => void) | null = null;
    const addEventListener = vi.fn((_t: "message", h: (e: MessageEvent<unknown>) => void) => {
      captured = h;
    });
    const removeEventListener = vi.fn();
    const handlers = {
      load: vi.fn(),
      compareLoad: vi.fn(),
      compareError: vi.fn(),
      viewLoad: vi.fn(),
    };

    installHostMessageRouter(
      { addEventListener, removeEventListener, postMessage },
      handlers,
    );
    if (!captured) throw new Error("addEventListener was not invoked");
    const dispatch = captured as (e: MessageEvent<unknown>) => void;
    dispatch({ data: { type: "load", text: "{}" } } as MessageEvent<unknown>);
    dispatch({ data: { type: "view-load", text: undefined } } as MessageEvent<unknown>);
    dispatch({ data: { type: "compare-error", source: "head", message: "x" } } as MessageEvent<unknown>);

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(handlers.load).toHaveBeenCalledTimes(1);
    expect(handlers.viewLoad).toHaveBeenCalledTimes(1);
    expect(handlers.compareError).toHaveBeenCalledTimes(1);
  });

  it("returns a cleanup that removes exactly the registered listener", () => {
    const postMessage = vi.fn();
    let registered: ((e: MessageEvent<unknown>) => void) | null = null;
    const addEventListener = vi.fn((_t: "message", h: (e: MessageEvent<unknown>) => void) => {
      registered = h;
    });
    const removeEventListener = vi.fn();
    const cleanup = installHostMessageRouter(
      { addEventListener, removeEventListener, postMessage },
      { load: vi.fn(), compareLoad: vi.fn(), compareError: vi.fn(), viewLoad: vi.fn() },
    );
    cleanup();
    expect(removeEventListener).toHaveBeenCalledTimes(1);
    expect(removeEventListener).toHaveBeenCalledWith("message", registered);
  });
});
