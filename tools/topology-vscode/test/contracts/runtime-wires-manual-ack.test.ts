// Integration: manual-ack runtime API (commits f2bffc6 + f9d929e).
// Pins (1) which edges each shape registers as manual-ack and
// (2) that clearManualAckSlot actually advances the cycle when the
// visual layer's auto-ack is suppressed.

import { describe, expect, it } from "vitest";
import {
  startWiresRuntime, stopWiresRuntime, getWiresMap,
  getManualAckEdges, isManualAckEdge, isSelfAckEdge, clearManualAckSlot,
  subscribeNodeTicks,
} from "../../src/substrate/runtime-wires";
import type { Spec } from "../../src/schema";

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

const shapeA = {
  nodes: [
    { id: "in0", type: "Input", data: { init: [1, 2] } },
    { id: "rg", type: "ReadGate" },
  ],
  edges: [
    { id: "in0->rg", source: "in0", sourceHandle: "out", target: "rg", targetHandle: "in", kind: "chain" },
  ],
} as unknown as Spec;

const shapeB = {
  nodes: [
    { id: "in0", type: "Input", data: { init: [7, 8] } },
    { id: "rg", type: "ReadGate" },
    { id: "i1", type: "ChainInhibitor" },
  ],
  edges: [
    { id: "in0->rg.chainIn", source: "in0", sourceHandle: "out", target: "rg", targetHandle: "chainIn", kind: "chain" },
    { id: "i1->rg.ack", source: "i1", sourceHandle: "out", target: "rg", targetHandle: "ack", kind: "chain" },
  ],
} as unknown as Spec;

describe("runtime-wires manual-ack registration", () => {
  it("shape A pair substrate: wForward is registered as manual-ack", async () => {
    await startWiresRuntime(shapeA);
    expect(getManualAckEdges()).toEqual([
      { id: "in0->rg", label: "in0→readGate" },
    ]);
    expect(isManualAckEdge("in0->rg")).toBe(true);
    // Pair substrate: the on-screen ⏏ click is the only ack. The
    // substrate must NOT self-ack wForward; the visual layer drives
    // the permit return via clearManualAckSlot.
    expect(isSelfAckEdge("in0->rg")).toBe(false);
    await stopWiresRuntime();
    expect(isSelfAckEdge("in0->rg")).toBe(false);
  });

  it("shape B registers both readGate slots as manual-ack", async () => {
    await startWiresRuntime(shapeB);
    const ids = getManualAckEdges().map((e) => e.id).sort();
    expect(ids).toEqual(["i1->rg.ack", "in0->rg.chainIn"]);
    await stopWiresRuntime();
  });
});

describe("clearManualAckSlot", () => {
  it("returns false for unregistered edges", async () => {
    await startWiresRuntime(shapeA);
    expect(clearManualAckSlot("not-a-real-edge")).toBe(false);
    await stopWiresRuntime();
  });

  it("shape A pair: clearing wForward releases the permit and refills with next value", async () => {
    await startWiresRuntime(shapeA);
    const wires = getWiresMap()!;
    const wForward = wires.get("in0->rg")!;

    // Seed pulse: in0 sends queue[0]=1 immediately on start.
    while (wForward.state !== "inFlight") await tick();
    expect(wForward.pending).toBe(1);

    // ⏏ click: clearManualAckSlot acks wForward; permit-release
    // handler fires synchronously; in0 sends queue[1]=2.
    expect(clearManualAckSlot("in0->rg")).toBe(true);
    while (wForward.state !== "inFlight") await tick();
    expect(wForward.pending).toBe(2);

    // No further pulses without another click.
    await tick(); await tick();
    expect(wForward.pending).toBe(2);

    await stopWiresRuntime();
  });

  it("shape B: clearing both slots advances readGate one fire", async () => {
    let rgTicks = 0;
    const off = subscribeNodeTicks((id) => { if (id === "rg") rgTicks += 1; });
    await startWiresRuntime(shapeB);
    const wires = getWiresMap()!;
    const inW = wires.get("in0->rg.chainIn")!;
    const ackW = wires.get("i1->rg.ack")!;

    // Wait until joinLoop has fired once and both wires are inFlight
    // again awaiting external ack (no auto-ack on manual edges).
    while (rgTicks < 1) await tick();
    while (inW.state !== "inFlight" || ackW.state !== "inFlight") await tick();

    expect(clearManualAckSlot("in0->rg.chainIn")).toBe(true);
    expect(clearManualAckSlot("i1->rg.ack")).toBe(true);

    while (rgTicks < 2) await tick();
    expect(rgTicks).toBeGreaterThanOrEqual(2);

    await stopWiresRuntime();
    off();
  });
});
