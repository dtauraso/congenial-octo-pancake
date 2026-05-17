// @vitest-environment happy-dom
//
// D1: input([1,2]) → readgate(no out). After flush: gate.in0 filled with 1;
//     second value still queued (wire blocked by filled slot).
// D2: consume gate.in0, flush → gate.in0 fills with 2.
// D3: join with only one input filled — join never fires; both slots observable.

import { createRef } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { TopologyRoot, type TopologyRootHandle } from "../../src/webview/substrate-r/TopologyRoot";
import type { RTopologySpec } from "../../src/webview/substrate-r/spec";
import { patchSVG, flushRaf } from "./_harness";

vi.mock("../../src/webview/log/post", () => ({
  postLog: vi.fn(),
}));

import { postLog } from "../../src/webview/log/post";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.mocked(postLog).mockClear(); });
beforeEach(() => { vi.useFakeTimers(); });
beforeAll(() => { patchSVG(); });

function flush(n = 6): void { for (let i = 0; i < n; i++) flushRaf(); }

const PATH = "M 0 0 L 100 0";

function inputToGateSpec(queue: unknown[]): RTopologySpec {
  return {
    nodes: [
      { id: "src",  kind: "input",    props: { queue } },
      { id: "gate", kind: "readgate" },
    ],
    wires: [{ id: "w1", source: { nodeId: "src", port: "out" }, target: { nodeId: "gate", port: "slot" }, pathD: PATH, arcLength: 0 }],
  };
}

describe("D1: backpressure — second value held in queue", () => {
  it("gate fills with first value; input skips second (wire blocked)", () => {
    const ref = createRef<TopologyRootHandle>();
    render(<TopologyRoot ref={ref} spec={inputToGateSpec([1, 2])} />);
    flush();

    expect(ref.current!.node("gate")!.slotPhase("slot")).toBe("filled");
    // Only one input.fire should have loaded the wire (second is blocked)
    const fireCalls = vi.mocked(postLog).mock.calls.filter(
      ([lbl, d]) => lbl === "trace.input.fire" && d?.["node"] === "src",
    );
    expect(fireCalls.length).toBe(1);
  });
});

describe("D2: consume releases backpressure; next value delivered", () => {
  it("consuming gate slot then flushing delivers value 2", () => {
    const ref = createRef<TopologyRootHandle>();
    render(<TopologyRoot ref={ref} spec={inputToGateSpec([1, 2])} />);
    flush();

    // Clear before consume to capture the reaction triggered by consume
    vi.mocked(postLog).mockClear();

    // Consume slot — must be in act so React can process synchronous reactions
    let v1: unknown;
    act(() => { v1 = ref.current!.node("gate")!.consume("slot"); });
    expect(v1).toBe(1);

    flush();

    expect(ref.current!.node("gate")!.slotPhase("slot")).toBe("filled");
    const v2fires = vi.mocked(postLog).mock.calls.filter(
      ([lbl, d]) => lbl === "trace.input.fire" && d?.["node"] === "src",
    );
    expect(v2fires.length).toBeGreaterThanOrEqual(1);
  });
});

describe("D3: join partial fill — join never fires", () => {
  it("join.a filled, join.b empty → join stays silent", () => {
    const ref = createRef<TopologyRootHandle>();
    const spec: RTopologySpec = {
      nodes: [
        { id: "srcA", kind: "input", props: { queue: [1] } },
        { id: "j",    kind: "join" },
        { id: "gate", kind: "readgate" },
      ],
      wires: [
        { id: "wA",  source: { nodeId: "srcA", port: "out" }, target: { nodeId: "j",    port: "a"   }, pathD: PATH, arcLength: 0 },
        { id: "wOut",source: { nodeId: "j",    port: "out" }, target: { nodeId: "gate", port: "slot" }, pathD: PATH, arcLength: 0 },
      ],
    };
    render(<TopologyRoot ref={ref} spec={spec} />);
    flush();

    expect(ref.current!.node("j")!.slotPhase("a")).toBe("filled");
    expect(ref.current!.node("j")!.slotPhase("b")).toBe("empty");
    expect(ref.current!.node("gate")!.slotPhase("slot")).toBe("empty");
  });
});
