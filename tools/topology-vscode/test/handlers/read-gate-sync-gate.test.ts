import { describe, expect, it } from "vitest";
import { run } from "./_helpers";

describe("ReadGate / SyncGate", () => {
  it("ReadGate forwards the value once ack arrives", () => {
    const after = run("ReadGate", "chainIn", 11).state;
    const r = run("ReadGate", "ack", 1, after);
    expect(r.emissions).toEqual([{ port: "out", value: 11 }]);
  });

  it("SyncGate emits release=1 once both inputs are present", () => {
    const after = run("SyncGate", "a", 1).state;
    const r = run("SyncGate", "b", 1, after);
    expect(r.emissions).toEqual([{ port: "release", value: 1 }]);
  });
});
