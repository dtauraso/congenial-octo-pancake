// @vitest-environment happy-dom
//
// 2-slot ReadGate partial-fill behavior.
// Since wire.load(0) was removed from ReadGate, partial fill is a no-op:
// the gate does not emit and does not consume any slots.

import { createRef } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { TopologyRoot, type TopologyRootHandle } from "../../src/webview/substrate-r/TopologyRoot";
import type { RTopologySpec } from "../../src/webview/substrate-r/spec";
import { patchSVG } from "./_harness";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers(); });
beforeAll(() => { patchSVG(); });

function flushRaf() { act(() => { vi.advanceTimersByTime(50); }); }

const TWO_SLOT_SPEC: RTopologySpec = {
  nodes: [
    { id: "src0", kind: "input", props: { queue: [1] } },
    { id: "src1", kind: "input", props: { queue: [2] } },
    { id: "gate", kind: "readgate", ports: { inputs: ["in0", "in1"], outputs: ["out"] } },
    { id: "sink", kind: "relay" },
  ],
  wires: [
    { id: "src0ToGate", source: { nodeId: "src0", port: "out" }, target: { nodeId: "gate", port: "in0" }, pathD: "M 0 0 L 100 0", arcLength: 0 },
    { id: "src1ToGate", source: { nodeId: "src1", port: "out" }, target: { nodeId: "gate", port: "in1" }, pathD: "M 0 50 L 100 50", arcLength: 0 },
    { id: "gateToSink", source: { nodeId: "gate", port: "out" }, target: { nodeId: "sink", port: "in0" }, pathD: "M 100 0 L 200 0", arcLength: 0 },
  ],
};

const PARTIAL_ONLY_SPEC: RTopologySpec = {
  nodes: [
    { id: "src0", kind: "input", props: { queue: [1] } },
    { id: "gate", kind: "readgate", ports: { inputs: ["in0", "in1"], outputs: ["out"] } },
    { id: "sink", kind: "relay" },
  ],
  wires: [
    { id: "src0ToGate", source: { nodeId: "src0", port: "out" }, target: { nodeId: "gate", port: "in0" }, pathD: "M 0 0 L 100 0", arcLength: 0 },
    { id: "gateToSink", source: { nodeId: "gate", port: "out" }, target: { nodeId: "sink", port: "in0" }, pathD: "M 100 0 L 200 0", arcLength: 0 },
  ],
};

describe("2-slot ReadGate partial-fill behavior", () => {
  it("partial fill (1-of-2 slots) does not emit and does not consume slots", () => {
    const ref = createRef<TopologyRootHandle>();
    render(<TopologyRoot ref={ref} spec={PARTIAL_ONLY_SPEC} />);
    flushRaf();
    flushRaf();
    // Sink should not be filled — gate emits nothing on partial fill
    expect(ref.current!.node("sink")!.slotPhase("in0")).not.toBe("filled");
    // Gate slot remains filled (not consumed)
    expect(ref.current!.node("gate")!.slotPhase("in0")).toBe("filled");
  });

  it("2-slot gate: both slots must be filled before gate fires", () => {
    const ref = createRef<TopologyRootHandle>();
    render(<TopologyRoot ref={ref} spec={TWO_SLOT_SPEC} />);
    flushRaf();
    flushRaf();
    // Both src0 and src1 have queued values — gate should fire and sink fills
    expect(ref.current!.node("sink")!.slotPhase("in0")).toBe("filled");
    expect(ref.current!.node("sink")!.consume("in0")).toBe(1);
  });
});
