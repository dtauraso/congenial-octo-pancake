// @vitest-environment happy-dom
//
// 2-input join: srcA → join.a, srcB → join.b, join → readgate. The
// join's firing rule requires both slots `filled`; until both
// predecessor cohorts arrive, the join does not emit and the
// readgate's slot stays empty.

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
      { id: "wOut", source: { nodeId: "j", port: "out" }, target: { nodeId: "gate", port: "in0" },
        pathD: "M 100 25 L 200 25", arcLength: 0 },
    ],
  };
}

function flushRaf() { act(() => { vi.advanceTimersByTime(50); }); }

describe("2-input join", () => {
  it("parseSpec assigns wA=0, wB=0, wOut=1", () => {
    const spec = parseSpec(makeJoin([1], [2]));
    expect(spec.wires.find((w) => w.id === "wA")!.cohort).toBe(0);
    expect(spec.wires.find((w) => w.id === "wB")!.cohort).toBe(0);
    expect(spec.wires.find((w) => w.id === "wOut")!.cohort).toBe(1);
  });

  it("only one predecessor delivers → join never emits; readgate stays empty", () => {
    const { getByTestId, container } = render(
      <TopologyRoot spec={makeJoin([1], [])} haltedOnMount />,
    );
    act(() => { fireEvent.click(getByTestId("step")); });
    flushRaf();
    act(() => { fireEvent.click(getByTestId("step")); });
    flushRaf();
    const btn = container.querySelector('[data-input-id="in0"]')!;
    expect(btn.getAttribute("data-armed")).toBe("false");
  });

  it("both predecessors deliver → second step releases cohort 1; readgate fills", () => {
    const { getByTestId, container } = render(
      <TopologyRoot spec={makeJoin([1], [2])} haltedOnMount />,
    );
    act(() => { fireEvent.click(getByTestId("step")); });
    flushRaf();
    expect(getByTestId("tick").textContent).toBe("tick: 1");
    const btn = container.querySelector('[data-input-id="in0"]')!;
    expect(btn.getAttribute("data-armed")).toBe("false");

    act(() => { fireEvent.click(getByTestId("step")); });
    flushRaf();
    expect(getByTestId("tick").textContent).toBe("tick: 2");
    expect(btn.getAttribute("data-armed")).toBe("true");
  });
});
