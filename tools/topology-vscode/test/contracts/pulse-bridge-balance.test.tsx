// @vitest-environment happy-dom
//
// Contract C4 (docs/planning/visual-editor/contracts.md):
// PulseInstance's view→sim bridge calls noteEdgePulseStarted /
// noteEdgePulseEnded as a balanced pair per mount lifetime — exactly
// once on mount, exactly once on unmount, regardless of how many
// times the geom/speed effect re-runs (window resize, RF re-layout).
//
// The load-bearing comment in PulseInstance.tsx:88-92 splits the
// bridge into its own [edgeId]-keyed effect for this reason. Folding
// noteEdgePulseEnded into the [geom, speedPxPerMs] cleanup would
// free the simulator's edge slot on every reflow; the resulting
// counter drift was the original "stuck pulses + dropped slots"
// regression. This test pins the split.

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

describe("contract C4: pulse-bridge balance", () => {
  it("activeAnimations returns to 0 after a mount/unmount", () => {
    const { unmount } = render(harness("e1", geomA));
    expect(state.activeAnimations).toBe(1);
    unmount();
    expect(state.activeAnimations).toBe(0);
  });

  it("rerender with new geom does NOT re-fire the bridge", () => {
    // The regression this guards: if noteEdgePulseEnded lived inside
    // the [geom, speedPxPerMs] effect's cleanup, this rerender would
    // fire end+start again and the slot would be freed mid-flight.
    const { rerender, unmount } = render(harness("e1", geomA));
    expect(state.activeAnimations).toBe(1);
    rerender(harness("e1", geomB));
    expect(state.activeAnimations).toBe(1);
    rerender(harness("e1", geomA));
    expect(state.activeAnimations).toBe(1);
    unmount();
    expect(state.activeAnimations).toBe(0);
  });

  it("multiple distinct edges balance independently", () => {
    const a = render(harness("e1", geomA));
    const b = render(harness("e2", geomA));
    expect(state.activeAnimations).toBe(2);
    a.unmount();
    expect(state.activeAnimations).toBe(1);
    b.unmount();
    expect(state.activeAnimations).toBe(0);
  });
});
