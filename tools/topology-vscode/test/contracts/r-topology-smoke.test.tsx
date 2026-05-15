// @vitest-environment happy-dom
//
// End-to-end smoke test for the self-scheduling substrate, driven by an
// RTopologySpec. Mounts TopologyRoot with one Input → wire → ReadGate
// and exercises the full cycle: InputBody self-fires on mount, wire
// arrives, slot fills, button arms, click consumes, next pulse fires.
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
  it("wire arrives → slot fills → button arms → click consumes", () => {
    const { container } = render(<TopologyRoot spec={makeSpec([42])} />);
    flushRaf();

    const btn = container.querySelector('[data-input-id="in0"]')!;
    expect(btn.getAttribute("data-armed")).toBe("true");

    act(() => { fireEvent.click(btn); });
    expect(btn.getAttribute("data-armed")).toBe("false");
  });

  it("subsequent pulse emits next value from the queue", () => {
    const { container } = render(<TopologyRoot spec={makeSpec([1, 2])} />);
    flushRaf();

    const btn = container.querySelector('[data-input-id="in0"]')!;
    expect(btn.getAttribute("data-armed")).toBe("true");
    act(() => { fireEvent.click(btn); }); // consume → slot empties → canAccept fires → next load
    flushRaf();
    expect(btn.getAttribute("data-armed")).toBe("true");
    act(() => { fireEvent.click(btn); });
    expect(btn.getAttribute("data-armed")).toBe("false");
  });

  it("queue exhaustion: no pulse after queue is empty", () => {
    const { container } = render(<TopologyRoot spec={makeSpec([1])} />);
    flushRaf();

    const btn = container.querySelector('[data-input-id="in0"]')!;
    act(() => { fireEvent.click(btn); }); // consume → canAccept fires → queue empty → no load
    flushRaf();
    expect(btn.getAttribute("data-armed")).toBe("false");
  });
});
