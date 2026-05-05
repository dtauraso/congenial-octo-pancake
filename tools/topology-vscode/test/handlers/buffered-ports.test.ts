import { describe, expect, it } from "vitest";
import { bufferedPorts } from "../../src/sim/handlers";
import type { HandlerState } from "../../src/schema";
import { run } from "./_helpers";

describe("bufferedPorts derivation", () => {
  it("returns empty for missing or empty state", () => {
    expect(bufferedPorts(undefined)).toEqual([]);
    expect(bufferedPorts({})).toEqual([]);
  });

  it("lists ports whose __has_<port> flag is 1, ignoring other state", () => {
    const state: HandlerState = { a: 5, __has_a: 1, b: 7, held: 3 };
    expect(bufferedPorts(state).sort()).toEqual(["a"]);
  });

  it("matches what the AndGate.a handler writes after the first input arrives", () => {
    const after = run("AndGate", "a", 1);
    expect(bufferedPorts(after.state)).toEqual(["a"]);
    expect(after.emissions).toEqual([]);
  });

  it("clears once the join fires (both inputs present)", () => {
    const afterA = run("AndGate", "a", 1);
    const afterB = run("AndGate", "b", 1, afterA.state);
    expect(bufferedPorts(afterB.state)).toEqual([]);
  });
});
