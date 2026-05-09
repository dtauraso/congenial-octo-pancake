// Contract: matchSubstrate shape B — Input -> ReadGate.chainIn AND
// ChainInhibitor -> ReadGate.ack. ReadGate joins both via joinLoop and
// waits for the visual layer to ack both inbound wires before looping.
// Tests drive the acks manually to simulate visual traversal completion.

import { describe, expect, it } from "vitest";
import {
  startWiresRuntime, stopWiresRuntime, getWiresMap,
  subscribeNodeTicks,
} from "../../src/substrate/runtime-wires";
import { ackWire } from "../../src/substrate/wire";
import type { Spec } from "../../src/schema";

const spec = {
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

describe("runtime-wires shape B (Input + ChainInhibitor -> ReadGate)", () => {
  it("readGate fires once per (chainIn, ack) pair, paced by external acks", async () => {
    const counts = new Map<string, number>();
    let resolveReached: () => void = () => undefined;
    const reachedFive = new Promise<void>((r) => { resolveReached = r; });
    const off = subscribeNodeTicks((id) => {
      counts.set(id, (counts.get(id) ?? 0) + 1);
      if ((counts.get("rg") ?? 0) === 5) resolveReached();
    });
    await startWiresRuntime(spec);
    const wires = getWiresMap()!;
    const inWire = wires.get("in0->rg.chainIn")!;
    const ackWireE = wires.get("i1->rg.ack")!;

    // Simulate the visual layer: every time both wires are inFlight and
    // joinLoop has fired (rg tick), ack both wires so the cycle advances.
    let prevRg = 0;
    const tick = () => new Promise<void>((r) => setTimeout(r, 0));
    while ((counts.get("rg") ?? 0) < 5) {
      const rg = counts.get("rg") ?? 0;
      if (rg > prevRg && inWire.state === "inFlight" && ackWireE.state === "inFlight") {
        ackWire(inWire);
        ackWire(ackWireE);
        prevRg = rg;
      }
      await tick();
    }
    await reachedFive;
    await stopWiresRuntime();
    off();

    expect((counts.get("rg") ?? 0)).toBeGreaterThanOrEqual(5);
    expect((counts.get("in0") ?? 0)).toBeGreaterThanOrEqual(5);
    expect((counts.get("i1") ?? 0)).toBeGreaterThanOrEqual(5);
  });
});
