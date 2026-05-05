import { describe, expect, it } from "vitest";
import { MOTION_TYPES } from "../../src/sim/handlers";

describe("MOTION_TYPES", () => {
  it("lists Partition (the only motion-bearing handler today)", () => {
    expect(MOTION_TYPES.has("Partition")).toBe(true);
  });
  it("does not list non-motion handlers", () => {
    expect(MOTION_TYPES.has("ChainInhibitor")).toBe(false);
    expect(MOTION_TYPES.has("AndGate")).toBe(false);
  });
});
