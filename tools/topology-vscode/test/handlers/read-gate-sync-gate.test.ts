import { describe, expect, it } from "vitest";
import { run } from "./_helpers";

describe("ReadGate / SyncGate", () => {
  it("ReadGate declines chainIn until ack is staged, then forwards", () => {
    // chainIn before ack: declined (state unchanged, source stays
    // backpressured by occupied slot upstream).
    const declined = run("ReadGate", "chainIn", 11);
    expect(declined.decline).toBe(true);
    expect(declined.state).toEqual({});
    // Stage ack first, then chainIn: now both halves present → fire.
    const after = run("ReadGate", "ack", 1).state;
    const r = run("ReadGate", "chainIn", 11, after);
    expect(r.emissions).toEqual([{ port: "out", value: 11 }]);
  });

  it("SyncGate emits release=1 once both inputs are present", () => {
    const after = run("SyncGate", "a", 1).state;
    const r = run("SyncGate", "b", 1, after);
    expect(r.emissions).toEqual([{ port: "release", value: 1 }]);
  });
});
