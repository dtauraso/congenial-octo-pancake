// @vitest-environment happy-dom
//
// 2-input join: srcA → join.a, srcB → join.b, join → readgate. The
// join's firing rule requires both slots filled. Under self-scheduling,
// both sources fire on mount and deliver concurrently.

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

function makeJoin(qa: unknown[], qb: unknown[]): RTopologySpec {
  return {
    nodes: [
      { id: "srcA", kind: "input", props: { queue: qa } },
      { id: "srcB", kind: "input", props: { queue: qb } },
      { id: "j", kind: "join" },
      { id: "gate", kind: "readgate" },
    ],
    wires: [
      { id: "wA", source: { nodeId: "srcA", port: "out" }, target: { nodeId: "j", port: "a" },
        pathD: "M 0 0 L 100 0", arcLength: 0 },
      { id: "wB", source: { nodeId: "srcB", port: "out" }, target: { nodeId: "j", port: "b" },
        pathD: "M 0 50 L 100 50", arcLength: 0 },
      { id: "wOut", source: { nodeId: "j", port: "out" }, target: { nodeId: "gate", port: "slot" },
        pathD: "M 100 25 L 200 25", arcLength: 0 },
    ],
  };
}

function flushRaf() { act(() => { vi.advanceTimersByTime(50); }); }

describe("2-input join", () => {
  it("only one predecessor delivers → join never emits; readgate stays empty", () => {
    const ref = createRef<TopologyRootHandle>();
    render(<TopologyRoot ref={ref} spec={makeJoin([1], [])} />);
    flushRaf();
    flushRaf();
    expect(ref.current!.node("gate")!.slotPhase("slot")).toBe("empty");
  });

  it("both predecessors deliver → join fires; readgate fills after arrivals", () => {
    const ref = createRef<TopologyRootHandle>();
    render(<TopologyRoot ref={ref} spec={makeJoin([1], [2])} />);
    flushRaf();
    flushRaf();
    expect(ref.current!.node("gate")!.slotPhase("slot")).toBe("filled");
  });
});
