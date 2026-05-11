// Slot-contract audit for the wire entity. Pins three rules from
// MODEL.md (Path A):
//
//   1. send-on-non-empty throws — no queue, no overwrite, no drop.
//   2. `taken → empty` is substrate-only — the transition emits no
//      renderer-facing message (no `arrived`); only the substrate
//      back-channel sees `acked`.
//   3. Only `loaded` traversal animates — headless wires
//      (`renderArrival: false`, the default) auto-mark arrival on
//      load; rendered wires (`renderArrival: true`) wait for the
//      renderer to call `markArrived()`. `taken` and `empty`
//      transitions never produce an `arrived` event.

import { describe, expect, it } from "vitest";
import { createWire, type WireEvent } from "../../src/substrate/wire-entity";

describe("Wire slot contract — send on non-empty throws", () => {
  it("throws when load() is called on a loaded wire", () => {
    const w = createWire<number>("e1");
    w.load(1);
    expect(() => w.load(2)).toThrow(/load on non-empty wire \(phase=loaded\)/);
  });

  it("throws when load() is called on a taken wire", () => {
    const w = createWire<number>("e1");
    w.load(1);
    w.take();
    expect(() => w.load(2)).toThrow(/load on non-empty wire \(phase=taken\)/);
  });
});

describe("Wire slot contract — taken → empty is substrate-only", () => {
  it("ack() emits no renderer-facing arrived event", () => {
    const w = createWire<number>("e1");
    w.load(1);
    w.take();

    const events: WireEvent[] = [];
    const off = w.onEvent((e) => events.push(e));
    w.ack();
    off();

    expect(w.state).toEqual({ kind: "empty" });
    expect(events.map((e) => e.kind)).toEqual(["acked"]);
    expect(events.some((e) => e.kind === "arrived")).toBe(false);
  });
});

describe("Wire slot contract — only loaded traversal animates", () => {
  it("headless wire (default renderArrival=false) auto-marks arrival on load", () => {
    const w = createWire<number>("e1");
    const events: WireEvent[] = [];
    w.onEvent((e) => events.push(e));
    w.load(1);
    expect(events.map((e) => e.kind)).toEqual(["loaded", "arrived"]);
  });

  it("rendered wire (renderArrival=true) defers arrived until markArrived()", () => {
    const w = createWire<number>("e1", true);
    const events: WireEvent[] = [];
    w.onEvent((e) => events.push(e));
    w.load(1);
    expect(events.map((e) => e.kind)).toEqual(["loaded"]);
    w.markArrived();
    expect(events.map((e) => e.kind)).toEqual(["loaded", "arrived"]);
  });

  it("taken and empty transitions emit no arrived event", () => {
    const w = createWire<number>("e1", true);
    w.load(1);
    w.markArrived();
    const events: WireEvent[] = [];
    w.onEvent((e) => events.push(e));
    w.take();
    w.ack();
    expect(events.map((e) => e.kind)).toEqual(["taken", "acked"]);
    expect(events.some((e) => e.kind === "arrived")).toBe(false);
  });
});
