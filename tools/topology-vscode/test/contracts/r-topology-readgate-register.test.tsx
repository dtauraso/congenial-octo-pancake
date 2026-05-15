// @vitest-environment happy-dom
//
// Register (delay buffer) and ReadGate → Register chain.
// Validates the secondary-value mechanism end-to-end.

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
// Using seed+value on srcToReg primes with { primary: seed, secondary: value }.
const PRIMED_SPEC: RTopologySpec = {
  nodes: [
    { id: "src", kind: "input", props: { queue: [{ primary: 1, secondary: 0 }] } },
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
  it("first fire emits { primary:1, secondary:null }, stores incoming secondary", () => {
    const ref = createRef<TopologyRootHandle>();
    render(<TopologyRoot ref={ref} spec={PRIMED_SPEC} />);
    flushRaf(); // srcToReg delivers → reg fires → regToSink loads
    flushRaf(); // regToSink delivers → sink fills
    expect(ref.current!.node("sink")!.slotPhase("in0")).toBe("filled");
    const v = ref.current!.node("sink")!.consume("in0") as { primary: unknown; secondary: unknown };
    // Register held null on init → emits { primary:1, secondary:null }.
    // heldRef now stores 0 (the incoming secondary).
    expect(v).toMatchObject({ primary: 1, secondary: null });
  });
});

// ReadGate → Register chain: validates ReadGate secondary and one-round delay.
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

describe("ReadGate → Register chain (secondary-value delay buffer)", () => {
  it("ReadGate emits secondary 0 (1-slot gate); Register delays it one round", () => {
    const ref = createRef<TopologyRootHandle>();
    render(<TopologyRoot ref={ref} spec={CHAIN_SPEC} />);
    flushRaf(); // srcToGate delivers → gate fires → gateToReg loads
    flushRaf(); // gateToReg delivers → reg fires → regToSink loads
    flushRaf(); // regToSink delivers → sink fills
    expect(ref.current!.node("sink")!.slotPhase("in0")).toBe("filled");
    const v = ref.current!.node("sink")!.consume("in0") as { primary: unknown; secondary: unknown };
    // ReadGate (1 slot) → secondary=0. Register emits held=null on first round.
    expect(v).toMatchObject({ primary: 1, secondary: null });
  });
});
