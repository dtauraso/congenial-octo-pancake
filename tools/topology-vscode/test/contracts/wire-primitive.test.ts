// Commit 1 of revised step 1: Wire primitive + builder.
// No runtime yet — these tests pin the contract that subsequent
// commits will rely on.

import { describe, expect, it } from "vitest";
import { ackWire, createWire } from "../../src/substrate/wire";
import { buildWires } from "../../src/substrate/build-wires";
import type { Spec } from "../../src/schema";

describe("Wire primitive", () => {
  it("starts idle with no pending value", () => {
    const w = createWire("e1");
    expect(w.state).toBe("idle");
    expect(w.pending).toBeNull();
  });

  it("transitions idle -> inFlight on send, back on ack", async () => {
    const w = createWire("e1");
    const sendPromise = w.send(42);
    expect(w.state).toBe("inFlight");
    expect(w.pending).toBe(42);
    ackWire(w);
    await sendPromise;
    expect(w.state).toBe("idle");
    expect(w.pending).toBeNull();
  });

  it("notifies arrive listeners with the sent value", async () => {
    const w = createWire("e1");
    const seen: unknown[] = [];
    w.onArrive((v) => seen.push(v));
    const p = w.send("hello");
    ackWire(w);
    await p;
    expect(seen).toEqual(["hello"]);
  });

  it("rejects send while inFlight", async () => {
    const w = createWire("e1");
    const p = w.send(1);
    await expect(w.send(2)).rejects.toThrow(/inFlight/);
    ackWire(w);
    await p;
  });
});

describe("buildWires", () => {
  it("instantiates one Wire per edge, keyed by id", () => {
    const spec = {
      nodes: [],
      edges: [
        { id: "input->readgate", source: "i", sourceHandle: "out", target: "r", targetHandle: "in", kind: "data" },
        { id: "readgate->ack", source: "r", sourceHandle: "ack", target: "i", targetHandle: "ack", kind: "ack" },
      ],
    } as unknown as Spec;
    const wires = buildWires(spec);
    expect(wires.size).toBe(2);
    expect(wires.get("input->readgate")?.state).toBe("idle");
    expect(wires.get("readgate->ack")?.id).toBe("readgate->ack");
  });

  it("throws on duplicate edge ids", () => {
    const spec = {
      nodes: [],
      edges: [
        { id: "dup", source: "a", sourceHandle: "o", target: "b", targetHandle: "i", kind: "data" },
        { id: "dup", source: "a", sourceHandle: "o", target: "c", targetHandle: "i", kind: "data" },
      ],
    } as unknown as Spec;
    expect(() => buildWires(spec)).toThrow(/duplicate edge id/);
  });
});
