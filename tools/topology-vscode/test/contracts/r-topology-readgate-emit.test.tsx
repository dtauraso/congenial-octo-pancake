// @vitest-environment happy-dom
//
// Readgate with an `out` port emits `1` on its output wire when all
// slots fill and the wire can accept. Pins the firing rule needed to
// close the readGate → i0 → i1 → readGate cycle without manual clicks.
// With the legacy all-wires round-close, one step walks the full chain.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { TopologyRoot } from "../../src/webview/substrate-r/TopologyRoot";
import type { RTopologySpec } from "../../src/webview/substrate-r/spec";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers(); });
beforeAll(() => {
  if (!("getPointAtLength" in SVGPathElement.prototype)) {
    Object.defineProperty(SVGPathElement.prototype, "getPointAtLength", {
      value: () => ({ x: 0, y: 0 }), configurable: true,
    });
  }
});

function spec(): RTopologySpec {
  return {
    nodes: [
      { id: "src", kind: "input", props: { queue: [42] } },
      { id: "g1", kind: "readgate", ports: { inputs: ["in0"], outputs: ["out"] } },
      { id: "g2", kind: "readgate", ports: { inputs: ["in0"] } },
    ],
    wires: [
      {
        id: "w1",
        source: { nodeId: "src", port: "out" },
        target: { nodeId: "g1", port: "in0" },
        pathD: "M 0 0 L 100 0",
        arcLength: 0,
      },
      {
        id: "w2",
        source: { nodeId: "g1", port: "out" },
        target: { nodeId: "g2", port: "in0" },
        pathD: "M 100 0 L 200 0",
        arcLength: 0,
      },
    ],
  };
}

function flushRaf() { act(() => { vi.advanceTimersByTime(50); }); }

describe("readgate emits 1 on out wire when armed", () => {
  it("one step: g1 auto-emits, g2 slot fills without manual click", () => {
    const { getByTestId, container } = render(
      <TopologyRoot spec={spec()} haltedOnMount />,
    );

    act(() => { fireEvent.click(getByTestId("step")); });
    flushRaf();
    flushRaf();
    expect(getByTestId("tick").textContent).toBe("tick: 1");

    const buttons = container.querySelectorAll('[data-input-id="in0"]');
    const g2Btn = buttons[buttons.length - 1];
    expect(g2Btn.getAttribute("data-armed")).toBe("true");
  });
});
