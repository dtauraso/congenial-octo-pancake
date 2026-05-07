import { describe, it, expect, beforeEach } from "vitest";
import { register, unregister, ready, clear } from "../../src/sim/readiness";

describe("readiness registry", () => {
  beforeEach(() => clear());

  it("returns true for unregistered nodes", () => {
    expect(ready("anyId")).toBe(true);
  });

  it("returns the predicate's value when registered", () => {
    let allow = false;
    register("a", () => allow);
    expect(ready("a")).toBe(false);
    allow = true;
    expect(ready("a")).toBe(true);
  });

  it("unregister restores default-true behavior", () => {
    register("a", () => false);
    expect(ready("a")).toBe(false);
    unregister("a");
    expect(ready("a")).toBe(true);
  });

  it("isolates predicates per node id", () => {
    register("a", () => false);
    register("b", () => true);
    expect(ready("a")).toBe(false);
    expect(ready("b")).toBe(true);
    expect(ready("c")).toBe(true);
  });

  it("clear removes all predicates", () => {
    register("a", () => false);
    register("b", () => false);
    clear();
    expect(ready("a")).toBe(true);
    expect(ready("b")).toBe(true);
  });
});
