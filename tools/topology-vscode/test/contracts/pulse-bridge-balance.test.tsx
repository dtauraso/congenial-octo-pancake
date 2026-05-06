// @vitest-environment happy-dom
//
// Contract C4 (docs/planning/visual-editor/contracts.md):
// PulseInstance owns rendering only. It does NOT touch
// activeAnimations / activeAnimationsByEdge — those are the
// pulse-lifetimes module's responsibility (contract C6). Any
// geom/speed re-run, mount, or unmount of PulseInstance must leave
// the simulator's per-edge counters untouched.
//
// Why: the previous bridge lived in PulseInstance's useEffect and
// silently broke when a view abstraction (fold-halo) suppressed the
// component. Centralising lifecycle ownership in the runner layer
// (pulse-lifetimes.ts) decouples correctness from React mount.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";

// PulseInstance transitively imports webview/save, which calls
// acquireVsCodeApi() and getElementById() at module load. Stub the
// surface area the bridge effect needs.
vi.mock("../../src/webview/save", () => ({
  vscode: { postMessage: () => {}, setState: () => {}, getState: () => null },
}));

import { PulseInstance } from "../../src/webview/rf/AnimatedEdge/PulseInstance";
import type { PathGeom } from "../../src/webview/rf/AnimatedEdge/_geom-types";
import { state } from "../../src/sim/runner/_state";

afterEach(cleanup);
beforeEach(() => {
  state.activeAnimations = 0;
});

const geomA: PathGeom = {
  d: "M 0 0 L 100 0",
  segs: [{ kind: "straight", p0: { x: 0, y: 0 }, p1: { x: 100, y: 0 }, len: 100, ux: 1, uy: 0 }],
  cum: [0, 100],
  straightTotal: 100,
};
const geomB: PathGeom = {
  d: "M 0 0 L 200 0",
  segs: [{ kind: "straight", p0: { x: 0, y: 0 }, p1: { x: 200, y: 0 }, len: 200, ux: 1, uy: 0 }],
  cum: [0, 200],
  straightTotal: 200,
};

function harness(edgeId: string, geom: PathGeom) {
  return (
    <svg>
      <PulseInstance
        edgeId={edgeId}
        fromNodeId="src"
        toNodeId="dst"
        geom={geom}
        route="line"
        stroke="#000"
        value="1"
        speedPxPerMs={0.1}
        simStart={0}
        onDone={() => {}}
      />
    </svg>
  );
}

describe("contract C4: PulseInstance does not own lifecycle", () => {
  it("mount does not touch activeAnimations", () => {
    const { unmount } = render(harness("e1", geomA));
    expect(state.activeAnimations).toBe(0);
    unmount();
    expect(state.activeAnimations).toBe(0);
  });

  it("rerender with new geom does not touch activeAnimations", () => {
    const { rerender, unmount } = render(harness("e1", geomA));
    expect(state.activeAnimations).toBe(0);
    rerender(harness("e1", geomB));
    expect(state.activeAnimations).toBe(0);
    rerender(harness("e1", geomA));
    expect(state.activeAnimations).toBe(0);
    unmount();
    expect(state.activeAnimations).toBe(0);
  });

  it("multiple distinct edges keep activeAnimations at 0", () => {
    const a = render(harness("e1", geomA));
    const b = render(harness("e2", geomA));
    expect(state.activeAnimations).toBe(0);
    a.unmount();
    b.unmount();
    expect(state.activeAnimations).toBe(0);
  });
});
