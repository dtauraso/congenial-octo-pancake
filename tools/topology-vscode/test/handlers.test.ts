// Per-handler unit tests for the Phase 5.5 simulator seed set. Each
// handler is `(state, input, props) → (state', emissions)`; tests pin
// the contract one input at a time. If a Go node's behavior changes,
// update the corresponding handler and these tests together — they're
// the load-bearing claim that the simulator can mirror real Go behavior.

import { describe, expect, it } from "vitest";
import { getHandler, HANDLERS } from "../src/sim/handlers";
import { NODE_TYPES, type HandlerState } from "../src/schema";

const empty: HandlerState = {};

function run(type: string, port: string, value: number | string, state: HandlerState = empty, props: Record<string, number | string> = {}) {
  const h = getHandler(type, port);
  if (!h) throw new Error(`no handler for ${type}.${port}`);
  return h(state, { port, value }, props);
}

describe("HANDLERS coverage", () => {
  it("covers every input port of every NODE_TYPES entry except Input/Generic", () => {
    for (const [type, def] of Object.entries(NODE_TYPES)) {
      if (type === "Input" || type === "Generic") continue;
      for (const port of def.inputs) {
        expect(getHandler(type, port.name), `${type}.${port.name}`).toBeDefined();
      }
    }
  });
});

describe("ChainInhibitor", () => {
  it("emits held on out/readOld/inhibitOut, value on readNew, ack=1; updates held", () => {
    const r = run("ChainInhibitor", "in", 7, { held: 3 });
    expect(r.state.held).toBe(7);
    const byPort = Object.fromEntries(r.emissions.map((e) => [e.port, e.value]));
    expect(byPort).toEqual({ out: 3, readOld: 3, readNew: 7, inhibitOut: 3, ack: 1 });
  });

  it("treats missing held as 0 on first arrival", () => {
    const r = run("ChainInhibitor", "in", 5);
    expect(r.state.held).toBe(5);
    expect(r.emissions.find((e) => e.port === "out")?.value).toBe(0);
  });
});

describe("AndGate", () => {
  it("buffers one input without emitting", () => {
    const r = run("AndGate", "a", 1);
    expect(r.emissions).toEqual([]);
    expect(r.state.a).toBe(1);
  });

  it("emits 1 on out when both inputs are 1, then clears", () => {
    const after = run("AndGate", "a", 1).state;
    const r = run("AndGate", "b", 1, after);
    expect(r.emissions).toEqual([{ port: "out", value: 1 }]);
    expect(r.state.a).toBeUndefined();
    expect(r.state.b).toBeUndefined();
  });

  it("emits 0 on out when one input is 0", () => {
    const after = run("AndGate", "a", 0).state;
    const r = run("AndGate", "b", 1, after);
    expect(r.emissions).toEqual([{ port: "out", value: 0 }]);
  });
});

describe("InhibitRightGate", () => {
  it("emits 1 only when left=1 and right=0", () => {
    const after = run("InhibitRightGate", "left", 1).state;
    const r = run("InhibitRightGate", "right", 0, after);
    expect(r.emissions).toEqual([{ port: "out", value: 1 }]);
  });

  it("emits 0 for all other combinations", () => {
    for (const [l, rv] of [[1, 1], [0, 0], [0, 1]] as const) {
      const after = run("InhibitRightGate", "left", l).state;
      const r = run("InhibitRightGate", "right", rv, after);
      expect(r.emissions).toEqual([{ port: "out", value: 0 }]);
    }
  });
});

describe("ReadLatch", () => {
  it("buffers `in` silently", () => {
    const r = run("ReadLatch", "in", 42);
    expect(r.emissions).toEqual([]);
    expect(r.state.held).toBe(42);
  });

  it("ignores `release` if nothing is held", () => {
    const r = run("ReadLatch", "release", 1);
    expect(r.emissions).toEqual([]);
  });

  it("emits out=held + ack=1 on release, then clears held", () => {
    const after = run("ReadLatch", "in", 9).state;
    const r = run("ReadLatch", "release", 1, after);
    expect(r.emissions).toEqual([
      { port: "out", value: 9 },
      { port: "ack", value: 1 },
    ]);
    expect(r.state.held).toBeUndefined();
  });
});

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
    const same = run("StreakDetector", "new", 1, run("StreakDetector", "old", 1).state);
    expect(same.emissions).toEqual([
      { port: "done", value: 1 },
      { port: "streak", value: 1 },
    ]);
    const diff = run("StreakDetector", "new", 0, run("StreakDetector", "old", 1).state);
    expect(diff.emissions).toEqual([
      { port: "done", value: 1 },
      { port: "streak", value: 0 },
    ]);
  });
});

describe("Partition", () => {
  it("transitions NotInit → Growing on first 1, emits out=1", () => {
    const r = run("Partition", "in", 1);
    expect(r.state.phase).toBe(1);
    expect(r.emissions).toEqual([{ port: "out", value: 1 }]);
  });

  it("transitions Growing → Stopped on second 1, emits out=0", () => {
    const r = run("Partition", "in", 1, { phase: 1 });
    expect(r.state.phase).toBe(2);
    expect(r.emissions).toEqual([{ port: "out", value: 0 }]);
  });

  it("ignores zero values", () => {
    const r = run("Partition", "in", 0, { phase: 1 });
    expect(r.emissions).toEqual([]);
    expect(r.state.phase).toBe(1);
  });
});

describe("handler purity", () => {
  it("does not mutate the input state object", () => {
    const state: HandlerState = { held: 3 };
    const snap = { ...state };
    run("ChainInhibitor", "in", 7, state);
    expect(state).toEqual(snap);
  });
});

describe("HANDLERS map", () => {
  it("exposes only known node types", () => {
    for (const t of Object.keys(HANDLERS)) {
      expect(NODE_TYPES[t], `unknown type ${t} in HANDLERS`).toBeDefined();
    }
  });
});
