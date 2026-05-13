// @vitest-environment happy-dom
//
// Multi-cohort chain: Input → Relay → ReadGate. wire1 is cohort 0,
// wire2 is cohort 1. Verifies that cohort N+1 stays parked-on-gate
// until the cursor advances.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { TopologyRoot } from "../../src/webview/substrate-r/TopologyRoot";
import { parseSpec, type RTopologySpec } from "../../src/webview/substrate-r/spec";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers(); });
beforeAll(() => {
  if (!("getPointAtLength" in SVGPathElement.prototype)) {
    Object.defineProperty(SVGPathElement.prototype, "getPointAtLength", {
      value: () => ({ x: 0, y: 0 }), configurable: true,
    });
  }
});

function makeChain(queue: unknown[]): RTopologySpec {
  return {
    nodes: [
      { id: "src", kind: "input", props: { queue } },
      { id: "r", kind: "relay" },
      { id: "gate", kind: "readgate" },
    ],
    wires: [
      {
        id: "w1",
        source: { nodeId: "src", port: "out" },
        target: { nodeId: "r", port: "in0" },
        pathD: "M 0 0 L 100 0",
        arcLength: 0,
      },
      {
        id: "w2",
        source: { nodeId: "r", port: "out" },
        target: { nodeId: "gate", port: "in0" },
        pathD: "M 100 0 L 200 0",
        arcLength: 0,
      },
    ],
  };
}

function flushRaf() { act(() => { vi.advanceTimersByTime(50); }); }

describe("multi-cohort chain (Input → Relay → ReadGate)", () => {
  it("parseSpec assigns w1=cohort 0, w2=cohort 1", () => {
    const spec = parseSpec(makeChain([7]));
    const w1 = spec.wires.find((w) => w.id === "w1")!;
    const w2 = spec.wires.find((w) => w.id === "w2")!;
    expect(w1.cohort).toBe(0);
    expect(w2.cohort).toBe(1);
  });

  it("one step advances cursor to 1; w2 stays parked on gate (slot empty)", () => {
    const { getByTestId, container } = render(
      <TopologyRoot spec={makeChain([7])} haltedOnMount />,
    );
    expect(getByTestId("tick").textContent).toBe("tick: 0");

    act(() => { fireEvent.click(getByTestId("step")); });
    flushRaf();
    expect(getByTestId("tick").textContent).toBe("tick: 1");

    const btn = container.querySelector('[data-input-id="in0"]')!;
    expect(btn.getAttribute("data-armed")).toBe("false");
  });

  it("second step releases cohort 1; readgate slot fills", () => {
    const { getByTestId, container } = render(
      <TopologyRoot spec={makeChain([7])} haltedOnMount />,
    );
    act(() => { fireEvent.click(getByTestId("step")); });
    flushRaf();
    expect(getByTestId("tick").textContent).toBe("tick: 1");

    act(() => { fireEvent.click(getByTestId("step")); });
    flushRaf();
    expect(getByTestId("tick").textContent).toBe("tick: 2");

    const btn = container.querySelector('[data-input-id="in0"]')!;
    expect(btn.getAttribute("data-armed")).toBe("true");

    act(() => { fireEvent.click(btn); });
    expect(btn.getAttribute("data-armed")).toBe("false");
  });
});
