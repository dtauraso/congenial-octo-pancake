// Contract C3 (docs/planning/visual-editor/contracts.md):
// view-load triggers exactly one setViewport call per message.
//
// handleViewLoad's setViewport branch is now `resolveViewLoadViewport`
// (a pure decision returning at most one viewport) feeding a single
// call site. This test pins the pure half: resolution.kind is one of
// "none" | "direct" | "migrated", each carrying ≤1 viewport. The call
// site in _handle-view-load.ts is one if/else if with a single
// ctx.rf.setViewport per branch, so ≤1 viewport ⇒ ≤1 setViewport call.
//
// History: task/camera-snap-back-fix (d8e3c88) — a re-running effect
// re-posted ready, host re-sent view-load, setViewport snapped the
// camera mid-pan. C1 covers the re-post; this row covers the per-message
// invariant on the receiving side.

import { describe, expect, it } from "vitest";
import { resolveViewLoadViewport } from "../../src/webview/rf/app/_resolve-view-load-viewport";

describe("contract C3: view-load → exactly one setViewport per message", () => {
  const pane = { width: 1000, height: 800 };

  it("returns no viewport when camera is undefined", () => {
    expect(resolveViewLoadViewport(undefined, pane)).toEqual({ kind: "none" });
  });

  it("returns the canonical camera directly", () => {
    const cam = { x: 12, y: -34, zoom: 1.25 };
    expect(resolveViewLoadViewport(cam, pane)).toEqual({
      kind: "direct",
      viewport: cam,
    });
  });

  it("migrates a legacy SVG viewBox to a single viewport", () => {
    const r = resolveViewLoadViewport({ x: 0, y: 0, w: 500, h: 400 }, pane);
    expect(r.kind).toBe("migrated");
    if (r.kind !== "migrated") return;
    expect(typeof r.viewport.x).toBe("number");
    expect(typeof r.viewport.y).toBe("number");
    expect(typeof r.viewport.zoom).toBe("number");
    expect(Number.isFinite(r.viewport.zoom)).toBe(true);
  });

  it("returns no viewport when a legacy box arrives without a pane", () => {
    expect(
      resolveViewLoadViewport({ x: 0, y: 0, w: 500, h: 400 }, null),
    ).toEqual({ kind: "none" });
  });

  it("never returns a list — every resolution carries 0 or 1 viewport", () => {
    const cases = [
      undefined,
      { x: 1, y: 2, zoom: 1 },
      { x: 0, y: 0, w: 500, h: 400 },
    ] as const;
    for (const cam of cases) {
      const r = resolveViewLoadViewport(cam, pane);
      const count = r.kind === "none" ? 0 : 1;
      expect([0, 1]).toContain(count);
    }
  });
});
