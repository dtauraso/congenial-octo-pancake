// loadTrace + stepOnce drives FireEvent and EmitEvent in trace order.

import { describe, expect, it } from "vitest";
import { parseTrace } from "../../src/sim/trace";
import * as runner from "../../src/sim/runner";
import { fixtureA, readFixture } from "./_helpers";

describe("trace: runner replay", () => {
  it("loadTrace + stepOnce drives FireEvent and EmitEvent in trace order", () => {
    const events = parseTrace(readFixture("chain-cascade.trace.jsonl"));
    runner.loadTrace(fixtureA, events);
    const fired: string[] = [];
    const unsub = runner.subscribe((e) => {
      if (e.type === "fire")
        fired.push(`fire:${e.nodeId}/${e.inputPort}=${e.inputValue}`);
      else fired.push(`emit:${e.edgeId}=${e.value}`);
    });
    for (let i = 0; i < events.length; i++) runner.stepOnce();
    unsub();

    expect(fired).toEqual([
      "fire:rl/in=5",
      "fire:rl/release=1",
      "emit:rlToCi=5",
      "fire:ci/in=5",
    ]);
    expect(runner.isReplaying()).toBe(true);
  });
});
