// @vitest-environment happy-dom
//
// Register (delay buffer) and ReadGate → Register chain.

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

const PRIMED_SPEC: RTopologySpec = {
  nodes: [
    { id: "src", kind: "input", props: { queue: [0] } },
    { id: "reg", kind: "register" },
    { id: "sink", kind: "relay" },
  ],
  wires: [
    { id: "srcToReg", source: { nodeId: "src", port: "out" }, target: { nodeId: "reg", port: "slot" }, pathD: "M 0 0 L 100 0", arcLength: 0 },
    { id: "regToSink", source: { nodeId: "reg", port: "out" }, target: { nodeId: "sink", port: "slot" }, pathD: "M 100 0 L 200 0", arcLength: 0 },
  ],
};

describe("Register (delay buffer) — round 1 emits held null", () => {
  it("first fire emits null (held on init), stores incoming scalar", () => {
    const ref = createRef<TopologyRootHandle>();
    render(<TopologyRoot ref={ref} spec={PRIMED_SPEC} />);
    flushRaf();
    flushRaf();
    expect(ref.current!.node("sink")!.slotPhase("slot")).toBe("filled");
    expect(ref.current!.node("sink")!.consume("slot")).toBeNull();
  });
});

const CHAIN_SPEC: RTopologySpec = {
  nodes: [
    { id: "src", kind: "input", props: { queue: [42] } },
    { id: "gate", kind: "readgate", ports: { inputs: ["slot"], outputs: ["out"] } },
    { id: "reg", kind: "register" },
    { id: "sink", kind: "relay" },
  ],
  wires: [
    { id: "srcToGate", source: { nodeId: "src", port: "out" }, target: { nodeId: "gate", port: "slot" }, pathD: "M 0 0 L 100 0", arcLength: 0 },
    { id: "gateToReg", source: { nodeId: "gate", port: "out" }, target: { nodeId: "reg", port: "slot" }, pathD: "M 100 0 L 200 0", arcLength: 0 },
    { id: "regToSink", source: { nodeId: "reg", port: "out" }, target: { nodeId: "sink", port: "slot" }, pathD: "M 200 0 L 300 0", arcLength: 0 },
  ],
};

describe("ReadGate → Register chain (scalar delay buffer)", () => {
  it("ReadGate emits 1 (1-slot gate, all filled); Register delays it one round", () => {
    const ref = createRef<TopologyRootHandle>();
    render(<TopologyRoot ref={ref} spec={CHAIN_SPEC} />);
    flushRaf();
    flushRaf();
    flushRaf();
    expect(ref.current!.node("sink")!.slotPhase("slot")).toBe("filled");
    expect(ref.current!.node("sink")!.consume("slot")).toBeNull();
  });
});
