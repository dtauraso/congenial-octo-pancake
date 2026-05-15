// @vitest-environment happy-dom
//
// End-to-end smoke test for the self-scheduling substrate, driven by an
// RTopologySpec. Mounts TopologyRoot with one Input → wire → ReadGate
// and exercises the full cycle: InputBody self-fires on mount, wire
// arrives, slot fills.
//
// arcLength=0 collapses visible duration to a single RAF tick,
// keeping control-flow event ordering deterministic under fake timers.

import { createRef } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { TopologyRoot, type TopologyRootHandle } from "../../src/webview/substrate-r/TopologyRoot";
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
  it("wire arrives → slot fills", () => {
    const ref = createRef<TopologyRootHandle>();
    render(<TopologyRoot ref={ref} spec={makeSpec([42])} />);
    flushRaf();

    expect(ref.current!.node("gate")!.slotPhase("in0")).toBe("filled");
  });

  it("subsequent pulse fills slot again after consume", () => {
    const ref = createRef<TopologyRootHandle>();
    render(<TopologyRoot ref={ref} spec={makeSpec([1, 2])} />);
    flushRaf();

    const gate = ref.current!.node("gate")!;
    expect(gate.slotPhase("in0")).toBe("filled");
    act(() => { gate.requestConsume("in0"); });
    flushRaf();
    expect(gate.slotPhase("in0")).toBe("filled");
    act(() => { gate.requestConsume("in0"); });
    expect(gate.slotPhase("in0")).toBe("empty");
  });

  it("queue restart: slot refills after queue drains", () => {
    const ref = createRef<TopologyRootHandle>();
    render(<TopologyRoot ref={ref} spec={makeSpec([1])} />);
    flushRaf();

    const gate = ref.current!.node("gate")!;
    act(() => { gate.requestConsume("in0"); });
    flushRaf();
    expect(gate.slotPhase("in0")).toBe("filled");
  });
});
