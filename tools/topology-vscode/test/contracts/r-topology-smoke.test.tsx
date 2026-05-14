// @vitest-environment happy-dom
//
// End-to-end smoke test for the slot-in-node substrate, driven by an
// RTopologySpec. Mounts TopologyRoot with one Input → wire → ReadGate
// spec and exercises the full cycle (load → in-flight → arrive →
// slot filled → click → consume → next round).
//
// arcLength=0 so the wire's first RAF tick triggers `complete`,
// keeping the test deterministic under fake timers.

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

function makeSpec(queue: unknown[]): RTopologySpec {
  return {
    nodes: [
      { id: "src", kind: "input", props: { queue } },
      { id: "gate", kind: "readgate" },
    ],
    wires: [{
      id: "w0",
      source: { nodeId: "src", port: "out" },
      target: { nodeId: "gate", port: "in0" },
      pathD: "M 80 80 L 300 80",
      arcLength: 0,
    }],
  };
}

function flushRaf() {
  act(() => { vi.advanceTimersByTime(50); });
}

describe("TopologyRoot end-to-end (spec-driven)", () => {
  it("step → wire arrives → slot fills → button arms → click consumes", () => {
    const { getByTestId, container } = render(
      <TopologyRoot spec={makeSpec([42])} haltedOnMount />,
    );
    expect(getByTestId("tick").textContent).toBe("tick: 0");
    expect(getByTestId("halted").textContent).toBe("halted");

    act(() => { fireEvent.click(getByTestId("step")); });
    flushRaf();
    expect(getByTestId("tick").textContent).toBe("tick: 1");

    const btn = container.querySelector('[data-input-id="in0"]')!;
    expect(btn.getAttribute("data-armed")).toBe("true");

    act(() => { fireEvent.click(btn); });
    expect(btn.getAttribute("data-armed")).toBe("false");
  });

  it("subsequent step emits next value from the queue", () => {
    const { getByTestId, container } = render(
      <TopologyRoot spec={makeSpec([1, 2])} haltedOnMount />,
    );
    act(() => { fireEvent.click(getByTestId("step")); });
    flushRaf();
    expect(getByTestId("tick").textContent).toBe("tick: 1");
    const btn = container.querySelector('[data-input-id="in0"]')!;
    expect(btn.getAttribute("data-armed")).toBe("true");
    act(() => { fireEvent.click(btn); });
    expect(btn.getAttribute("data-armed")).toBe("false");

    act(() => { fireEvent.click(getByTestId("step")); });
    flushRaf();
    expect(getByTestId("tick").textContent).toBe("tick: 2");
    expect(btn.getAttribute("data-armed")).toBe("true");
    act(() => { fireEvent.click(btn); });
    expect(btn.getAttribute("data-armed")).toBe("false");
  });

  it("queue exhaustion: step with empty queue advances tick (no-op round)", () => {
    const { getByTestId, container } = render(
      <TopologyRoot spec={makeSpec([1])} haltedOnMount />,
    );
    act(() => { fireEvent.click(getByTestId("step")); });
    flushRaf();
    const btn = container.querySelector('[data-input-id="in0"]')!;
    act(() => { fireEvent.click(btn); });
    expect(getByTestId("tick").textContent).toBe("tick: 1");

    act(() => { fireEvent.click(getByTestId("step")); });
    expect(getByTestId("tick").textContent).toBe("tick: 2");
    expect(btn.getAttribute("data-armed")).toBe("false");
  });
});
