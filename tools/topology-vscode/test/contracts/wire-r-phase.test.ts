// Phase reducer for the <Wire> primitive under the slot-in-node model.
// Wire is transient: empty -> in-flight(v) -> empty. No parked state.

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

  it("empty -> load -> in-flight(v)", () => {
    const next = wirePhaseReducer(initialPhase, { type: "load", value: 42 });
    expect(next).toEqual({ kind: "in-flight", value: 42 });
  });

  it("in-flight -> arrive -> empty", () => {
    const inFlight: Phase = { kind: "in-flight", value: 7 };
    expect(wirePhaseReducer(inFlight, { type: "arrive" })).toEqual({ kind: "empty" });
  });

  it("load on in-flight throws (send-on-non-empty)", () => {
    const inFlight: Phase = { kind: "in-flight", value: 1 };
    expect(() => wirePhaseReducer(inFlight, { type: "load", value: 2 }))
      .toThrow(/load while in-flight/);
  });

  it("arrive on empty throws", () => {
    expect(() => wirePhaseReducer(initialPhase, { type: "arrive" }))
      .toThrow(/arrive while empty/);
  });

  it("full cycle: empty -> in-flight -> empty", () => {
    let p: Phase = initialPhase;
    p = wirePhaseReducer(p, { type: "load", value: "hello" });
    expect(p.kind).toBe("in-flight");
    p = wirePhaseReducer(p, { type: "arrive" });
    expect(p.kind).toBe("empty");
  });
});
