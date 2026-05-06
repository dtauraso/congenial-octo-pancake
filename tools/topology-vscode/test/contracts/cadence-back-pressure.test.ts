// Contract C10: spec-derived visual cadence back-pressure.
//
// `spec.cadenceAcks: [{ source, target }]` declares a back-pressure
// rule. Source = data destination (the "ack producer"). Target =
// gated source (the "ack consumer"). The cadence layer:
//   - suppresses sim notifies on the gated source's data edge while
//     awaiting the prior visible cycle to complete (filter only —
//     never synthesizes pulses);
//   - releases only when BOTH (a) the prior data-leg pulse anim-ends
//     AND (b) one of the destination's outbound pulses anim-ends.
//
// Whichever leg is slower dictates the gate. A regression where a
// single anim-end fires the gate (the bug the user observed at
// t=19850 where readGate output ended before the in0→RG arrival)
// would cause the third assertion in the integration test to fail.

import { describe, it, expect, beforeEach } from "vitest";
import {
  buildRegistry, isCadenced, mayEmit, markEmitted,
  signalPulseComplete, resetCadence,
} from "../../src/cadence/in0ReadGateAck";
import type { Spec } from "../../src/schema";

function spec(): Spec {
  return {
    nodes: [
      { id: "in0", type: "Input" },
      { id: "rg", type: "ReadGate" },
      { id: "out", type: "Input" },
    ],
    edges: [
      // Data leg: in0 → rg
      {
        id: "data", source: "in0", target: "rg",
        sourceHandle: "out", targetHandle: "chainIn", kind: "chain",
      },
      // Output leg: rg → out
      {
        id: "rg-out", source: "rg", target: "out",
        sourceHandle: "out", targetHandle: "in", kind: "chain",
      },
    ],
    cadenceAcks: [
      { source: "rg", target: "in0" },
    ],
  };
}

beforeEach(() => {
  resetCadence();
});

describe("contract C10: spec-derived cadence back-pressure", () => {
  it("buildRegistry registers the gated source from spec.cadenceAcks", () => {
    buildRegistry(spec());
    expect(isCadenced("in0")).toBe(true);
    expect(isCadenced("out")).toBe(false);
  });

  it("a non-cadenced source is always free to emit", () => {
    buildRegistry(spec());
    expect(mayEmit("out")).toBe(true);
    markEmitted("out", 1); // no-op for non-cadenced
    expect(mayEmit("out")).toBe(true);
  });

  it("after markEmitted the gated source is blocked", () => {
    buildRegistry(spec());
    expect(mayEmit("in0")).toBe(true);
    markEmitted("in0", 1);
    expect(mayEmit("in0")).toBe(false);
  });

  it("ONE anim-end alone does NOT release the gate", () => {
    buildRegistry(spec());
    markEmitted("in0", 1);
    // Only the data leg completes:
    signalPulseComplete("data", "in0");
    expect(mayEmit("in0")).toBe(false);
    // Reset and try the other leg alone:
    resetCadence();
    buildRegistry(spec());
    markEmitted("in0", 1);
    signalPulseComplete("rg-out", "rg");
    expect(mayEmit("in0")).toBe(false);
  });

  it("BOTH anim-ends release the gate, in either order", () => {
    buildRegistry(spec());

    // Order 1: data-leg first, then output.
    markEmitted("in0", 1);
    signalPulseComplete("data", "in0");
    signalPulseComplete("rg-out", "rg");
    expect(mayEmit("in0")).toBe(true);

    // Order 2: output first, then data-leg.
    markEmitted("in0", 2);
    signalPulseComplete("rg-out", "rg");
    expect(mayEmit("in0")).toBe(false);
    signalPulseComplete("data", "in0");
    expect(mayEmit("in0")).toBe(true);
  });

  it("re-arming after release blocks again until both legs complete", () => {
    buildRegistry(spec());
    // Cycle 1: arm + release.
    markEmitted("in0", 1);
    signalPulseComplete("data", "in0");
    signalPulseComplete("rg-out", "rg");
    expect(mayEmit("in0")).toBe(true);
    // Cycle 2: arm again. Stale signals from before must not pre-clear.
    markEmitted("in0", 2);
    expect(mayEmit("in0")).toBe(false);
    signalPulseComplete("data", "in0");
    expect(mayEmit("in0")).toBe(false);
    signalPulseComplete("rg-out", "rg");
    expect(mayEmit("in0")).toBe(true);
  });

  it("missing data edge leaves the source ungated (malformed spec)", () => {
    const malformed: Spec = {
      ...spec(),
      edges: spec().edges.filter((e) => e.id !== "data"),
    };
    buildRegistry(malformed);
    expect(isCadenced("in0")).toBe(false);
  });
});

// Integration: drive emitEvents through the runner and observe that
// the data-leg notify is suppressed while cadence is awaiting. Mirrors
// what happens when the live sim produces successive in0 emissions
// before readGate's cycle completes (the t=19850 race scenario).

import { subscribe, type WireEvent } from "../../src/sim/event-bus";
import { state } from "../../src/sim/runner/_state";
import { emitEvents } from "../../src/sim/runner/emit";
import type { FireRecord } from "../../src/sim/simulator";
import { signalPulseComplete as runnerSignalPulseComplete } from "../../src/sim/runner";

function fireRec(): FireRecord {
  return {
    ord: 0,
    tick: 0,
    cycle: 0,
    nodeId: "rg",
    inputPort: "chainIn",
    inputValue: 1,
    inEdgeId: "data",
    emissions: [],
  };
}

describe("contract C10: integration — emit.ts suppression", () => {
  let received: WireEvent[];
  let unsub: () => void;

  beforeEach(() => {
    resetCadence();
    received = [];
    unsub = subscribe((ev) => received.push(ev));
    state.spec = spec();
    state.world = { tick: 0 } as never;
    buildRegistry(state.spec);
  });

  function dataLegEmits(): number {
    return received.filter(
      (e) => e.type === "emit" && e.edgeId === "data",
    ).length;
  }

  it("first FireRecord notifies; subsequent are suppressed until both legs complete", () => {
    // First: passes.
    emitEvents(fireRec());
    expect(dataLegEmits()).toBe(1);

    // Sim fires another FireRecord before cadence releases:
    emitEvents(fireRec());
    expect(dataLegEmits()).toBe(1); // suppressed

    // Only one leg completes — still suppressed.
    runnerSignalPulseComplete("data", "in0");
    emitEvents(fireRec());
    expect(dataLegEmits()).toBe(1);

    // Both legs complete — next FireRecord passes.
    runnerSignalPulseComplete("rg-out", "rg");
    emitEvents(fireRec());
    expect(dataLegEmits()).toBe(2);
  });

  it("non-cadenced data edge is never suppressed", () => {
    state.spec = {
      ...spec(),
      cadenceAcks: [], // disable cadence
    };
    buildRegistry(state.spec);
    emitEvents(fireRec());
    emitEvents(fireRec());
    emitEvents(fireRec());
    expect(dataLegEmits()).toBe(3);
  });

  // teardown
  afterEach(() => {
    unsub();
    state.spec = null;
    state.world = null;
  });
});

import { afterEach } from "vitest";

