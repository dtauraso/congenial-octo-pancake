// runtime-wires: shape A (Input -> ReadGate). Trivial substrate.

import { describe, expect, it } from "vitest";
import { ackWire } from "../../src/substrate/wire";
import { startWiresRuntime, stopWiresRuntime, getWiresMap } from "../../src/substrate/runtime-wires";
import type { Spec } from "../../src/schema";

const spec = {
  nodes: [
    { id: "i", type: "Input", data: { init: [7, 8] } },
    { id: "r", type: "ReadGate" },
  ],
  edges: [
    { id: "i->r", source: "i", sourceHandle: "out", target: "r", targetHandle: "in", kind: "chain" },
  ],
} as unknown as Spec;

describe("runtime-wires", () => {
  it("starts loops and exposes wire map", async () => {
    await startWiresRuntime(spec);
    const wires = getWiresMap();
    expect(wires?.size).toBe(1);
    expect(wires?.get("i->r")).toBeDefined();
    await stopWiresRuntime();
    expect(getWiresMap()).toBeNull();
  });

  it("stop is idempotent", async () => {
    await stopWiresRuntime();
    await stopWiresRuntime();
    expect(getWiresMap()).toBeNull();
  });

  it("subscribeNodeHeld: receiver held value matches latest arrived", async () => {
    const { subscribeNodeHeld } = await import("../../src/substrate/runtime-wires");
    const held = new Map<string, unknown>();
    const off = subscribeNodeHeld((nodeId, value) => {
      held.set(nodeId, value);
    });
    await startWiresRuntime(spec);
    const wires = getWiresMap();
    const wire = wires?.get("i->r");
    if (!wire) throw new Error("wire missing");
    for (let i = 0; i < 3; i++) {
      while (wire.state !== "inFlight") await new Promise((r) => setTimeout(r, 0));
      ackWire(wire);
      await new Promise((r) => setTimeout(r, 0));
    }
    await stopWiresRuntime();
    off();
    expect([7, 8]).toContain(held.get("r"));
    expect(held.has("i")).toBe(false);
  });

  it("subscribeNodeBuffered: port marked while inFlight, cleared on ack", async () => {
    const { subscribeNodeBuffered } = await import("../../src/substrate/runtime-wires");
    const events: Array<{ nodeId: string; ports: string[] }> = [];
    const off = subscribeNodeBuffered((nodeId, ports) => {
      events.push({ nodeId, ports: [...ports] });
    });
    await startWiresRuntime(spec);
    const wires = getWiresMap();
    const wire = wires?.get("i->r");
    if (!wire) throw new Error("wire missing");
    while (wire.state !== "inFlight") await new Promise((r) => setTimeout(r, 0));
    ackWire(wire);
    await new Promise((r) => setTimeout(r, 0));
    await stopWiresRuntime();
    off();
    const r = events.filter((e) => e.nodeId === "r");
    expect(r.some((e) => e.ports.includes("in"))).toBe(true);
    expect(r.some((e) => e.ports.length === 0)).toBe(true);
  });

  it("subscribeNodeTicks: tick count matches send/ack count", async () => {
    const { subscribeNodeTicks } = await import("../../src/substrate/runtime-wires");
    const counts = new Map<string, number>();
    const off = subscribeNodeTicks((nodeId) => {
      counts.set(nodeId, (counts.get(nodeId) ?? 0) + 1);
    });
    await startWiresRuntime(spec);
    const wires = getWiresMap();
    const wire = wires?.get("i->r");
    if (!wire) throw new Error("wire missing");
    for (let i = 0; i < 3; i++) {
      while (wire.state !== "inFlight") await new Promise((r) => setTimeout(r, 0));
      ackWire(wire);
      await new Promise((r) => setTimeout(r, 0));
    }
    await stopWiresRuntime();
    off();
    expect((counts.get("i") ?? 0)).toBeGreaterThanOrEqual(3);
    expect((counts.get("r") ?? 0)).toBeGreaterThanOrEqual(3);
  });
});
