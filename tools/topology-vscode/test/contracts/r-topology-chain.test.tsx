// @vitest-environment happy-dom
//
// Chain: Input → Relay → ReadGate. Under self-scheduling, each node
// fires when its input arrives. Input fires on mount, relay fires when
// w1 arrives, readgate slot fills when w2 arrives.

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
  it("arrivals propagate the chain hop by hop; readgate fills", () => {
    const ref = createRef<TopologyRootHandle>();
    render(<TopologyRoot ref={ref} spec={makeChain([7])} />);
    flushRaf(); // w1 arrives → relay fires
    flushRaf(); // w2 arrives → readgate slot fills

    expect(ref.current!.node("gate")!.slotPhase("in0")).toBe("filled");
  });
});
