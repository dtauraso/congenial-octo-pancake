import { describe, expect, it } from "vitest";
import { run } from "./_helpers";

describe("StreakBreakDetector", () => {
  it("emits done=1 on sign change", () => {
    const after = run("StreakBreakDetector", "old", 0).state;
    const r = run("StreakBreakDetector", "new", 1, after);
    expect(r.emissions).toEqual([{ port: "done", value: 1 }]);
  });

  it("emits done=0 on matching signs", () => {
    const after = run("StreakBreakDetector", "old", 1).state;
    const r = run("StreakBreakDetector", "new", 1, after);
    expect(r.emissions).toEqual([{ port: "done", value: 0 }]);
  });
});

describe("StreakDetector", () => {
  it("always emits done=1 plus streak={0,1}", () => {
    const same = run(
      "StreakDetector",
      "new",
      1,
      run("StreakDetector", "old", 1).state,
    );
    expect(same.emissions).toEqual([
      { port: "done", value: 1 },
      { port: "streak", value: 1 },
    ]);
    const diff = run(
      "StreakDetector",
      "new",
      0,
      run("StreakDetector", "old", 1).state,
    );
    expect(diff.emissions).toEqual([
      { port: "done", value: 1 },
      { port: "streak", value: 0 },
    ]);
  });
});
