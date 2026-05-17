// @vitest-environment happy-dom
// A5: CI solo (no inhibitOut). E1: sequential consume. F1: wire seed.

import { createRef } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { TopologyRoot, type TopologyRootHandle } from "../../src/webview/substrate-r/TopologyRoot";
import type { RTopologySpec } from "../../src/webview/substrate-r/spec";
import { patchSVG, flushRaf } from "./_harness";
import { ciSoloChain } from "./_fixtures";

vi.mock("../../src/webview/log/post", () => ({ postLog: vi.fn() }));

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers(); });
beforeAll(() => { patchSVG(); });

const P = "M 0 0 L 100 0";
function flush(n = 6): void { for (let i = 0; i < n; i++) flushRaf(); }

describe("A5: CI solo — no inhibitOut wired", () => {
  it("relay fills when CI out wired but inhibitOut absent", () => {
    const ref = createRef<TopologyRootHandle>();
    render(<TopologyRoot ref={ref} spec={ciSoloChain([1])} />);
    flush();
    expect(ref.current!.node("relay")!.slotPhase("in0")).toBe("filled");
  });
});

describe("E1: sequential consume drains input queue in order", () => {
  it("consuming gate slot three times yields 1, 2, 3", () => {
    const ref = createRef<TopologyRootHandle>();
    const spec: RTopologySpec = {
      nodes: [
        { id: "src",  kind: "input",    props: { queue: [1, 2, 3] } },
        { id: "gate", kind: "readgate" },
      ],
      wires: [{ id: "w1", source: { nodeId: "src", port: "out" }, target: { nodeId: "gate", port: "in0" }, pathD: P, arcLength: 0 }],
    };
    render(<TopologyRoot ref={ref} spec={spec} />);
    flush();
    const values: unknown[] = [];
    for (let i = 0; i < 3; i++) {
      expect(ref.current!.node("gate")!.slotPhase("in0")).toBe("filled");
      let v: unknown;
      act(() => { v = ref.current!.node("gate")!.consume("in0"); });
      values.push(v);
      if (i < 2) flush();
    }
    expect(values).toEqual([1, 2, 3]);
  });
});

describe("F1: wire seed primes destination slot on mount", () => {
  it("relay.in0 is filled with seed value 5 after mount flush", () => {
    const ref = createRef<TopologyRootHandle>();
    const spec: RTopologySpec = {
      nodes: [
        { id: "src",   kind: "input", props: { queue: [] } },
        { id: "relay", kind: "relay" },
      ],
      wires: [{ id: "w1", source: { nodeId: "src", port: "out" }, target: { nodeId: "relay", port: "in0" }, pathD: P, arcLength: 0, seed: 5 }],
    };
    render(<TopologyRoot ref={ref} spec={spec} />);
    flush();
    expect(ref.current!.node("relay")!.slotPhase("in0")).toBe("filled");
  });
});

describe("G1: deferred-deliver — wire retries fill when dest slot occupied", () => {
  it("wire delivers once dest slot empties after initial fill blocked", () => {
    // Topology: src → gate (readgate, no out). Gate slot is pre-seeded
    // so it is already filled when the wire arrives. Wire must hold
    // the value and retry until requestConsume empties the slot.
    const ref = createRef<TopologyRootHandle>();
    const spec: RTopologySpec = {
      nodes: [
        { id: "src",  kind: "input",    props: { queue: [42] } },
        { id: "gate", kind: "readgate" },
      ],
      wires: [{
        id: "w1",
        source: { nodeId: "src",  port: "out" },
        target: { nodeId: "gate", port: "in0" },
        pathD: P, arcLength: 0,
        seed: 99, // pre-fills gate.in0 before src fires
      }],
    };
    render(<TopologyRoot ref={ref} spec={spec} />);
    flush();
    // gate.in0 should hold the seed value (wire arriving with 42 is deferred)
    expect(ref.current!.node("gate")!.slotPhase("in0")).toBe("filled");
    // Consume the seed — wire should now deliver 42
    act(() => { ref.current!.node("gate")!.requestConsume("in0"); });
    flush();
    expect(ref.current!.node("gate")!.slotPhase("in0")).toBe("filled");
    expect(ref.current!.node("gate")!.consume("in0")).toBe(42);
  });
});

describe("D3-ext: readgate 3-input — 2 filled, 1 empty — no fire", () => {
  it("readgate does not fire when third slot empty", () => {
    const ref = createRef<TopologyRootHandle>();
    const spec: RTopologySpec = {
      nodes: [
        { id: "srcA", kind: "input",    props: { queue: [1] } },
        { id: "srcB", kind: "input",    props: { queue: [1] } },
        { id: "gate", kind: "readgate", ports: { inputs: ["in0", "in1", "in2"] } },
      ],
      wires: [
        { id: "wA", source: { nodeId: "srcA", port: "out" }, target: { nodeId: "gate", port: "in0" }, pathD: P, arcLength: 0 },
        { id: "wB", source: { nodeId: "srcB", port: "out" }, target: { nodeId: "gate", port: "in1" }, pathD: P, arcLength: 0 },
      ],
    };
    render(<TopologyRoot ref={ref} spec={spec} />);
    flush();
    expect(ref.current!.node("gate")!.slotPhase("in0")).toBe("filled");
    expect(ref.current!.node("gate")!.slotPhase("in1")).toBe("filled");
    expect(ref.current!.node("gate")!.slotPhase("in2")).toBe("empty");
  });
});
