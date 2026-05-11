// Phase reducer for the new React-resident <Wire>. Pins allowed
// transitions and the send-on-non-empty throw from the slot contract.

import { describe, it, expect } from "vitest";
import {
  initialPhase,
  wirePhaseReducer,
  type Phase,
} from "../../src/webview/substrate-r/wire-phase";

describe("wirePhaseReducer", () => {
  it("starts empty", () => {
    expect(initialPhase).toEqual({ kind: "empty" });
  });

  it("empty -> load -> loaded(v)", () => {
    const next = wirePhaseReducer(initialPhase, { type: "load", value: 42 });
    expect(next).toEqual({ kind: "loaded", value: 42 });
  });

  it("loaded -> take -> taken(v) (value preserved)", () => {
    const loaded: Phase = { kind: "loaded", value: "x" };
    const next = wirePhaseReducer(loaded, { type: "take" });
    expect(next).toEqual({ kind: "taken", value: "x" });
  });

  it("taken -> ack -> empty", () => {
    const taken: Phase = { kind: "taken", value: 7 };
    const next = wirePhaseReducer(taken, { type: "ack" });
    expect(next).toEqual({ kind: "empty" });
  });

  it("load on loaded throws (send-on-non-empty)", () => {
    const loaded: Phase = { kind: "loaded", value: 1 };
    expect(() => wirePhaseReducer(loaded, { type: "load", value: 2 }))
      .toThrow(/load while loaded/);
  });

  it("load on taken throws", () => {
    const taken: Phase = { kind: "taken", value: 1 };
    expect(() => wirePhaseReducer(taken, { type: "load", value: 2 }))
      .toThrow(/load while taken/);
  });

  it("take on empty throws", () => {
    expect(() => wirePhaseReducer(initialPhase, { type: "take" }))
      .toThrow(/take while empty/);
  });

  it("take on taken throws", () => {
    const taken: Phase = { kind: "taken", value: 1 };
    expect(() => wirePhaseReducer(taken, { type: "take" }))
      .toThrow(/take while taken/);
  });

  it("ack on empty throws", () => {
    expect(() => wirePhaseReducer(initialPhase, { type: "ack" }))
      .toThrow(/ack while empty/);
  });

  it("ack on loaded throws", () => {
    const loaded: Phase = { kind: "loaded", value: 1 };
    expect(() => wirePhaseReducer(loaded, { type: "ack" }))
      .toThrow(/ack while loaded/);
  });

  it("full cycle: empty -> loaded -> taken -> empty", () => {
    let p: Phase = initialPhase;
    p = wirePhaseReducer(p, { type: "load", value: "hello" });
    expect(p.kind).toBe("loaded");
    p = wirePhaseReducer(p, { type: "take" });
    expect(p.kind).toBe("taken");
    p = wirePhaseReducer(p, { type: "ack" });
    expect(p.kind).toBe("empty");
  });
});
