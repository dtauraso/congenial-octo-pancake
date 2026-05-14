// @vitest-environment happy-dom
//
// Chain: Input → Relay → ReadGate. With the legacy all-wires round-close,
// one step walks the chain to quiescence: all nodes fire, all wires
// complete, then the round closes in a single step.

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

describe("chain (Input → Relay → ReadGate)", () => {
  it("step + arrivals propagate the chain hop by hop; readgate fills", () => {
    const { getByTestId, container } = render(
      <TopologyRoot spec={makeChain([7])} haltedOnMount />,
    );
    expect(getByTestId("tick").textContent).toBe("tick: 0");

    act(() => { fireEvent.click(getByTestId("step")); });
    flushRaf();
    flushRaf();
    expect(getByTestId("tick").textContent).toBe("tick: 1");

    const btn = container.querySelector('[data-input-id="in0"]')!;
    expect(btn.getAttribute("data-armed")).toBe("true");

    act(() => { fireEvent.click(btn); });
    expect(btn.getAttribute("data-armed")).toBe("false");
  });
});
