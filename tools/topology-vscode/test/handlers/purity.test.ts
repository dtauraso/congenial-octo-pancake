import { describe, expect, it } from "vitest";
import type { HandlerState } from "../../src/schema";
import { run } from "./_helpers";

describe("handler purity", () => {
  it("does not mutate the input state object", () => {
    const state: HandlerState = { held: 3 };
    const snap = { ...state };
    run("ChainInhibitor", "in", 7, state);
    expect(state).toEqual(snap);
  });
});
