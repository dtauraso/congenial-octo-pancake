// Phase 1 ticked substrate contract: 5 inputs → 5 ticks, inbound port
// empty between ticks. Plan:
// docs/planning/visual-editor/handoff-ticked-substrate-plan.md.

import { describe, expect, it } from "vitest";
import {
  startTickedShapeA, stopTicked, tickedStep,
  tickedTickCount, tickedInboxLen, tickedEdgeId,
} from "../../src/substrate/ticked";
import {
  startWiresRuntime, stopWiresRuntime, isWiresRuntimeRunning,
} from "../../src/substrate/runtime-wires";
import type { Spec } from "../../src/schema";

const shapeA: Spec = {
  nodes: [
    { id: "in0", type: "Input", data: { init: [1, 2, 3, 4, 5] } },
    { id: "rg", type: "ReadGate" },
  ],
  edges: [
    {
      id: "in0->rg", source: "in0", sourceHandle: "out",
      target: "rg", targetHandle: "in", kind: "chain",
    },
  ],
  runtime: "ticked",
} as unknown as Spec;

describe("ticked substrate (Phase 1, Shape A)", () => {
  it("5 inputs → 5 ticks, inbound empty between ticks", () => {
    startTickedShapeA(shapeA);
    const edgeId = tickedEdgeId();
    expect(edgeId).toBe("in0->rg");

    for (let i = 1; i <= 5; i++) {
      const t = tickedStep();
      expect(t).toBe(i);
      expect(tickedInboxLen(edgeId)).toBe(0);
    }
    expect(tickedTickCount()).toBe(5);
    stopTicked();
  });

  it("startWiresRuntime dispatches to ticked runtime when spec.runtime === 'ticked'", async () => {
    await startWiresRuntime(shapeA);
    expect(isWiresRuntimeRunning()).toBe(true);
    // Driver runs every 600ms by default; we don't await it here, just
    // verify the dispatch path took us into the ticked module.
    await stopWiresRuntime();
    expect(isWiresRuntimeRunning()).toBe(false);
  });
});
