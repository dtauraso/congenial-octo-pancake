// Phase 5.5 simulator tests. Each fixture is a small spec; we seed it
// with one or two ignition events and assert the resulting fire history
// matches what the wired Go topology would produce. Tests pin:
//   - per-handler routing through edges
//   - FIFO tie-break (determinism across two runs)
//   - cycle counter (quiescent-input default + cycleAnchor override)
//   - F1 deterministic replayTo

import { describe, expect, it } from "vitest";
import {
  initWorld,
  step,
  runToQuiescent,
  replayTo,
  type World,
} from "../src/sim/simulator";
import type { Spec, Edge } from "../src/schema";

function edge(id: string, source: string, sourceHandle: string, target: string, targetHandle: string, kind: Edge["kind"] = "any"): Edge {
  return { id, source, sourceHandle, target, targetHandle, kind };
}

function fireSummary(w: World): Array<[string, string, number | string]> {
  return w.history.map((h) => [h.nodeId, h.inputPort, h.inputValue]);
}

// Fixture A: Input → ReadLatch → ChainInhibitor.
// Seed an Input "out" pulse, plus a release pulse at the latch.
const fixtureA: Spec = {
  nodes: [
    { id: "in", type: "Input", x: 0, y: 0 },
    { id: "rl", type: "ReadLatch", x: 1, y: 0 },
    { id: "ci", type: "ChainInhibitor", x: 2, y: 0 },
  ],
  edges: [
    edge("inToRl", "in", "out", "rl", "in", "chain"),
    edge("rlToCi", "rl", "out", "ci", "in", "chain"),
  ],
  timing: {
    steps: [],
    seed: [
      { nodeId: "in", outPort: "out", value: 5, atTick: 0 },
      // External release pulse — in real Go this comes from the
      // ack-loop; here we synthesize it directly to keep the fixture
      // small.
      { nodeId: "rl", outPort: "release", value: 1, atTick: 1 },
    ],
  },
};

describe("simulator: Input → ReadLatch → ChainInhibitor (fixture A)", () => {
  it("propagates the seed value through the chain", () => {
    // The release seed targets rl.release directly — represent that as a
    // self-edge so the seed routing finds it.
    const spec: Spec = {
      ...fixtureA,
      edges: [
        ...fixtureA.edges,
        edge("releaseInjector", "rl", "release", "rl", "release", "release"),
      ],
    };
    const final = runToQuiescent(spec);
    const fires = fireSummary(final);
    // ReadLatch buffers `in`, fires on `release`; emits to ci.in;
    // ChainInhibitor processes ci.in and stores held=5.
    expect(fires).toContainEqual(["rl", "in", 5]);
    expect(fires).toContainEqual(["rl", "release", 1]);
    expect(fires).toContainEqual(["ci", "in", 5]);
    const ciState = final.state.ci;
    expect(ciState.held).toBe(5);
  });
});

// Fixture B: AndGate join — both inputs ignite simultaneously.
const fixtureB: Spec = {
  nodes: [
    { id: "srcA", type: "Input", x: 0, y: 0 },
    { id: "srcB", type: "Input", x: 0, y: 1 },
    { id: "and", type: "AndGate", x: 1, y: 0 },
  ],
  edges: [
    edge("aIn", "srcA", "out", "and", "a", "signal"),
    edge("bIn", "srcB", "out", "and", "b", "signal"),
  ],
  timing: {
    steps: [],
    seed: [
      { nodeId: "srcA", outPort: "out", value: 1, atTick: 0 },
      { nodeId: "srcB", outPort: "out", value: 1, atTick: 0 },
    ],
  },
};

describe("simulator: AndGate join (fixture B)", () => {
  it("fires AndGate.out=1 when both inputs are 1", () => {
    const final = runToQuiescent(fixtureB);
    const andFire = final.history.find(
      (h) => h.nodeId === "and" && h.emissions.some((e) => e.port === "out"),
    );
    expect(andFire?.emissions).toEqual([{ port: "out", value: 1 }]);
  });

  it("fires AndGate.out=0 when only one input is 1", () => {
    const spec: Spec = {
      ...fixtureB,
      timing: {
        steps: [],
        seed: [
          { nodeId: "srcA", outPort: "out", value: 1, atTick: 0 },
          { nodeId: "srcB", outPort: "out", value: 0, atTick: 0 },
        ],
      },
    };
    const final = runToQuiescent(spec);
    const andFire = final.history.find(
      (h) => h.nodeId === "and" && h.emissions.some((e) => e.port === "out"),
    );
    expect(andFire?.emissions).toEqual([{ port: "out", value: 0 }]);
  });
});

// Fixture C: SyncGate releases a DetectorLatch — exercise gating.
const fixtureC: Spec = {
  nodes: [
    { id: "src", type: "Input", x: 0, y: 0 },
    { id: "sigA", type: "Input", x: 0, y: 1 },
    { id: "sigB", type: "Input", x: 0, y: 2 },
    { id: "sg", type: "SyncGate", x: 1, y: 1 },
    { id: "dl", type: "DetectorLatch", x: 2, y: 0 },
  ],
  edges: [
    edge("srcToDl", "src", "out", "dl", "in", "chain"),
    edge("aToSg", "sigA", "out", "sg", "a", "signal"),
    edge("bToSg", "sigB", "out", "sg", "b", "signal"),
    edge("sgToDl", "sg", "release", "dl", "release", "release"),
  ],
  timing: {
    steps: [],
    seed: [
      { nodeId: "src", outPort: "out", value: 99, atTick: 0 },
      { nodeId: "sigA", outPort: "out", value: 1, atTick: 0 },
      { nodeId: "sigB", outPort: "out", value: 1, atTick: 0 },
    ],
  },
};

describe("simulator: SyncGate-released DetectorLatch (fixture C)", () => {
  it("latch fires only after SyncGate releases", () => {
    const final = runToQuiescent(fixtureC);
    const dlReleaseFire = final.history.find(
      (h) => h.nodeId === "dl" && h.inputPort === "release",
    );
    const dlInFire = final.history.find(
      (h) => h.nodeId === "dl" && h.inputPort === "in",
    );
    const sgFire = final.history.find(
      (h) => h.nodeId === "sg" && h.emissions.some((e) => e.port === "release"),
    );
    expect(dlInFire).toBeDefined();
    expect(sgFire).toBeDefined();
    expect(dlReleaseFire).toBeDefined();
    // Release must fire after SyncGate emits.
    expect(sgFire!.ord).toBeLessThan(dlReleaseFire!.ord);
    // Latch out must carry the source value.
    const out = dlReleaseFire!.emissions.find((e) => e.port === "out");
    expect(out?.value).toBe(99);
  });
});

describe("simulator: determinism", () => {
  it("two independent runs produce identical history + state", () => {
    const a = runToQuiescent(fixtureC);
    const b = runToQuiescent(fixtureC);
    expect(a.history).toEqual(b.history);
    expect(a.state).toEqual(b.state);
    expect(a.tick).toBe(b.tick);
    expect(a.cycle).toBe(b.cycle);
  });
});

describe("simulator: cycle counter", () => {
  it("(ii-a) increments cycle once per quiescent drain", () => {
    const final = runToQuiescent(fixtureB);
    expect(final.cycle).toBe(1);
  });

  it("(ii-b) cycleAnchor counts every handler invocation on the anchor node", () => {
    const spec: Spec = { ...fixtureB, cycleAnchor: "and" };
    const final = runToQuiescent(spec);
    // AndGate's handler runs twice (once per input port — buffer on
    // first arrival, emit on second). The cycle counter ticks per
    // handler call, not per emission. Topologies that want
    // emission-counting semantics should anchor on a downstream node
    // whose handler runs exactly once per anchor cycle.
    expect(final.cycle).toBe(2);
  });

  it("step() on an empty queue is a no-op", () => {
    const w0 = initWorld({ ...fixtureB, timing: { steps: [], seed: [] } });
    const w1 = step(fixtureB, w0);
    expect(w1.queue).toEqual([]);
    expect(w1.history).toEqual([]);
    expect(w1.cycle).toBe(0);
  });
});

describe("simulator: replayTo", () => {
  it("fast-forwards to the requested cycle deterministically", () => {
    // Two pulses through fixture B → cycle increments to 1 then queue
    // empty. Asking for cycle 1 should return the same world that
    // runToQuiescent produces.
    const replayed = replayTo(fixtureB, 1);
    const direct = runToQuiescent(fixtureB);
    expect(replayed.history).toEqual(direct.history);
    expect(replayed.cycle).toBe(1);
  });
});

// Fixture D: motion-bearing handler (Partition) propagates dx into
// world.state, which the renderer reads to drive node-position tweens.
// This is the contract Chunk A relies on: simulator state IS the
// motion source — no separate keyframe track.
describe("simulator: motion-bearing state (Phase 6 Chunk A)", () => {
  it("Partition phase advances accumulate dx in world.state", () => {
    const spec: Spec = {
      nodes: [
        { id: "src", type: "Input", x: 0, y: 0 },
        { id: "p", type: "Partition", x: 0, y: 0 },
      ],
      edges: [edge("srcToP", "src", "out", "p", "in", "chain")],
      timing: {
        seed: [
          { nodeId: "src", outPort: "out", value: 1, atTick: 0 },
          { nodeId: "src", outPort: "out", value: 1, atTick: 1 },
        ],
      },
    };
    const final = runToQuiescent(spec);
    // Default slidePx=30; two transitions → dx=60.
    expect(final.state.p.dx).toBe(60);
  });
});

describe("simulator: per-edge data.delay", () => {
  it("delays delivery by edge.data.delay instead of the default", () => {
    const slow: Edge = {
      ...edge("inToRl", "in", "out", "rl", "in", "chain"),
      data: { delay: 7 },
    };
    const spec: Spec = {
      nodes: [
        { id: "in", type: "Input", x: 0, y: 0 },
        { id: "rl", type: "ReadLatch", x: 1, y: 0 },
      ],
      edges: [slow],
      timing: {
        seed: [{ nodeId: "in", outPort: "out", value: 1, atTick: 0 }],
      },
    };
    const w = initWorld(spec);
    // Seed schedules the edge with baseTick=0, defaultDelay=0 +
    // edge override 7 → readyAt should be 7.
    expect(w.queue[0].readyAt).toBe(7);
  });

  it("falls back to emission default when edge.data has no delay", () => {
    const spec: Spec = {
      nodes: [
        { id: "in", type: "Input", x: 0, y: 0 },
        { id: "rl", type: "ReadLatch", x: 1, y: 0 },
      ],
      edges: [edge("inToRl", "in", "out", "rl", "in", "chain")],
      timing: {
        seed: [{ nodeId: "in", outPort: "out", value: 1, atTick: 3 }],
      },
    };
    const w = initWorld(spec);
    expect(w.queue[0].readyAt).toBe(3);
  });
});

describe("simulator: handler purity", () => {
  it("does not mutate the spec or earlier worlds", () => {
    const w0 = initWorld(fixtureB);
    const snapQ = w0.queue.length;
    const snapState = JSON.stringify(w0.state);
    runToQuiescent(fixtureB);
    expect(w0.queue.length).toBe(snapQ);
    expect(JSON.stringify(w0.state)).toBe(snapState);
  });
});
