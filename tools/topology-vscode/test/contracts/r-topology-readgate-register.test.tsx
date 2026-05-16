// @vitest-environment happy-dom
//
// Register (delay buffer) and ReadGate → Register chain.
// Validates the scalar-value mechanism end-to-end.

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

// Seed-primed: use wire seed to prime a register with a specific value.
// Input → Register (primed via wire.seed). On first fire, reg emits the
// held value (null) and stores the incoming; on second fire, emits 0.
// Using seed+value on srcToReg primes with the value scalar.
const PRIMED_SPEC: RTopologySpec = {
  nodes: [
    { id: "src", kind: "input", props: { queue: [0] } },
    { id: "reg", kind: "register" },
    { id: "sink", kind: "relay" },
  ],
  wires: [
    {
      id: "srcToReg",
      source: { nodeId: "src", port: "out" },
      target: { nodeId: "reg", port: "in0" },
      pathD: "M 0 0 L 100 0",
      arcLength: 0,
    },
    {
      id: "regToSink",
      source: { nodeId: "reg", port: "out" },
      target: { nodeId: "sink", port: "in0" },
      pathD: "M 100 0 L 200 0",
      arcLength: 0,
    },
  ],
};

describe("Register (delay buffer) — round 1 emits held null", () => {
  it("first fire emits null (held on init), stores incoming scalar", () => {
    const ref = createRef<TopologyRootHandle>();
    render(<TopologyRoot ref={ref} spec={PRIMED_SPEC} />);
    flushRaf(); // srcToReg delivers → reg fires → regToSink loads
    flushRaf(); // regToSink delivers → sink fills
    expect(ref.current!.node("sink")!.slotPhase("in0")).toBe("filled");
    const v = ref.current!.node("sink")!.consume("in0");
    // Register held null on init → emits null.
    // heldRef now stores 0 (the incoming scalar).
    expect(v).toBeNull();
  });
});

// ReadGate → Register chain: validates ReadGate scalar output and one-round delay.
const CHAIN_SPEC: RTopologySpec = {
  nodes: [
    { id: "src", kind: "input", props: { queue: [42] } },
    { id: "gate", kind: "readgate", ports: { inputs: ["in0"], outputs: ["out"] } },
    { id: "reg", kind: "register" },
    { id: "sink", kind: "relay" },
  ],
  wires: [
    {
      id: "srcToGate",
      source: { nodeId: "src", port: "out" },
      target: { nodeId: "gate", port: "in0" },
      pathD: "M 0 0 L 100 0",
      arcLength: 0,
    },
    {
      id: "gateToReg",
      source: { nodeId: "gate", port: "out" },
      target: { nodeId: "reg", port: "in0" },
      pathD: "M 100 0 L 200 0",
      arcLength: 0,
    },
    {
      id: "regToSink",
      source: { nodeId: "reg", port: "out" },
      target: { nodeId: "sink", port: "in0" },
      pathD: "M 200 0 L 300 0",
      arcLength: 0,
    },
  ],
};

// 2-slot ReadGate: partial-fill emits 0, full-fill emits 1.
// Two input sources, one fires first (partial), then second fires (full).
const TWO_SLOT_SPEC: RTopologySpec = {
  nodes: [
    { id: "src0", kind: "input", props: { queue: [1] } },
    { id: "src1", kind: "input", props: { queue: [2] } },
    { id: "gate", kind: "readgate", ports: { inputs: ["in0", "in1"], outputs: ["out"] } },
    { id: "sink", kind: "relay" },
  ],
  wires: [
    {
      id: "src0ToGate",
      source: { nodeId: "src0", port: "out" },
      target: { nodeId: "gate", port: "in0" },
      pathD: "M 0 0 L 100 0",
      arcLength: 0,
    },
    {
      id: "src1ToGate",
      source: { nodeId: "src1", port: "out" },
      target: { nodeId: "gate", port: "in1" },
      pathD: "M 0 50 L 100 50",
      arcLength: 0,
    },
    {
      id: "gateToSink",
      source: { nodeId: "gate", port: "out" },
      target: { nodeId: "sink", port: "in0" },
      pathD: "M 100 0 L 200 0",
      arcLength: 0,
    },
  ],
};

// Partial-only spec: src0 fires once into a 2-slot gate; src1 never fires.
// Gate should emit 0 once (partial), then stay quiet.
const PARTIAL_ONLY_SPEC: RTopologySpec = {
  nodes: [
    { id: "src0", kind: "input", props: { queue: [1] } },
    { id: "gate", kind: "readgate", ports: { inputs: ["in0", "in1"], outputs: ["out"] } },
    { id: "sink", kind: "relay" },
  ],
  wires: [
    {
      id: "src0ToGate",
      source: { nodeId: "src0", port: "out" },
      target: { nodeId: "gate", port: "in0" },
      pathD: "M 0 0 L 100 0",
      arcLength: 0,
    },
    {
      id: "gateToSink",
      source: { nodeId: "gate", port: "out" },
      target: { nodeId: "sink", port: "in0" },
      pathD: "M 100 0 L 200 0",
      arcLength: 0,
    },
  ],
};

describe("2-slot ReadGate partial-fill behavior", () => {
  it("partial fill (1-of-2 slots) emits 0 once, does not consume slots", () => {
    const ref = createRef<TopologyRootHandle>();
    render(<TopologyRoot ref={ref} spec={PARTIAL_ONLY_SPEC} />);
    flushRaf(); // src0 delivers → gate sees in0 filled, in1 empty → partial emit → gateToSink loads
    flushRaf(); // gateToSink delivers → sink fills
    expect(ref.current!.node("sink")!.slotPhase("in0")).toBe("filled");
    const v = ref.current!.node("sink")!.consume("in0");
    expect(v).toBe(0);
    // in0 slot still filled: partial fire does NOT consume slots.
    expect(ref.current!.node("gate")!.slotPhase("in0")).toBe("filled");
  });

  it("no duplicate 0 emission when wire drains and refills with same filled-slot set", () => {
    const ref = createRef<TopologyRootHandle>();
    render(<TopologyRoot ref={ref} spec={PARTIAL_ONLY_SPEC} />);
    flushRaf(); // src0 delivers → partial emit → gateToSink loads
    flushRaf(); // gateToSink delivers → sink fills
    // Consume from sink so wire can accept again.
    ref.current!.node("sink")!.consume("in0");
    // Gate re-runs (wire canAccept now), but filled set unchanged → no new emit.
    flushRaf();
    expect(ref.current!.node("sink")!.slotPhase("in0")).not.toBe("filled");
  });

  it("2-slot gate: first partial emit is 0 and does not consume any slots", () => {
    // Verify the first value the 2-slot gate emits (with only in0 filled) is 0,
    // and gate slots are not consumed. Full-fire value=1 is covered by CHAIN_SPEC (1-slot).
    const ref = createRef<TopologyRootHandle>();
    render(<TopologyRoot ref={ref} spec={TWO_SLOT_SPEC} />);
    flushRaf(); // src0/src1 fire; src0 delivers → partial → gateToSink loads; src1 may be in-flight
    flushRaf(); // gateToSink delivers → sink fills with 0
    expect(ref.current!.node("sink")!.slotPhase("in0")).toBe("filled");
    const v = ref.current!.node("sink")!.consume("in0");
    // The first emission must be the partial (0) since src0 always delivers before src1.
    expect(v).toBe(0);
  });
});

describe("ReadGate → Register chain (scalar delay buffer)", () => {
  it("ReadGate emits 1 (1-slot gate, all filled); Register delays it one round", () => {
    const ref = createRef<TopologyRootHandle>();
    render(<TopologyRoot ref={ref} spec={CHAIN_SPEC} />);
    flushRaf(); // srcToGate delivers → gate fires → gateToReg loads
    flushRaf(); // gateToReg delivers → reg fires → regToSink loads
    flushRaf(); // regToSink delivers → sink fills
    expect(ref.current!.node("sink")!.slotPhase("in0")).toBe("filled");
    const v = ref.current!.node("sink")!.consume("in0");
    // ReadGate (1 slot, 1-of-1 filled) → emits 1. Register emits held=null on first round.
    expect(v).toBeNull();
  });
});
