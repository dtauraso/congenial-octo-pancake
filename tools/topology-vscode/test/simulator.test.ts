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
  enqueueEmission,
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
    // atTick=3 is future-dated, so the seed sits in pendingSeeds rather
    // than the queue. One step advances tick to 3 and drains the seed
    // through scheduleEmission with baseTick=3 + defaultDelay=0.
    let w = initWorld(spec);
    expect(w.pendingSeeds.length).toBe(1);
    w = step(spec, w);
    expect(w.history[0]?.tick).toBe(3);
  });
});

describe("simulator: self-pacer under backlog (audit row #3)", () => {
  // Mirrors runner.ts's N1' concurrent-edge self-pacer: on each arrival
  // at the target, re-enqueue the same value at world.tick+1. Pin that
  // pulses arrive in the order they were re-fired and that none are
  // dropped, even when the downstream node is slow/backlogged.
  const spec: Spec = {
    nodes: [
      { id: "in", type: "Input", x: 0, y: 0 },
      { id: "ci", type: "ChainInhibitor", x: 1, y: 0 },
    ],
    edges: [edge("inToCi", "in", "out", "ci", "in", "chain")],
    timing: { seed: [{ nodeId: "in", outPort: "out", value: 1, atTick: 0 }] },
  };

  it("re-fires preserve FIFO arrival order at the target", () => {
    let w = initWorld(spec);
    const arrivals: number[] = [];
    let nextValue = 1;
    // Drive the runner's self-pacer pattern by hand for N rounds.
    for (let i = 0; i < 10; i++) {
      if (w.queue.length === 0) break;
      const before = w.history.length;
      w = step(spec, w);
      const fresh = w.history.slice(before);
      for (const rec of fresh) {
        if (rec.nodeId === "ci") {
          arrivals.push(rec.inputValue as number);
          // Self-pacer: re-emit a fresh value to detect any reordering.
          nextValue += 1;
          enqueueEmission(spec, w, "in", "out", nextValue, w.tick + 1);
        }
      }
    }
    expect(arrivals.length).toBeGreaterThan(3);
    // Arrivals must be strictly increasing — any reorder/drop breaks this.
    for (let i = 1; i < arrivals.length; i++) {
      expect(arrivals[i]).toBe(arrivals[i - 1] + 1);
    }
  });

  it("queue stays sorted by (readyAt, id) after every re-enqueue", () => {
    let w = initWorld(spec);
    for (let i = 0; i < 20; i++) {
      if (w.queue.length === 0) break;
      w = step(spec, w);
      enqueueEmission(spec, w, "in", "out", 1, w.tick + 1);
      for (let j = 1; j < w.queue.length; j++) {
        const a = w.queue[j - 1];
        const b = w.queue[j];
        const ok = a.readyAt < b.readyAt || (a.readyAt === b.readyAt && a.id < b.id);
        expect(ok).toBe(true);
      }
    }
  });
});

describe("simulator: edge slot capacity (audit row #1)", () => {
  // Single edge with slots:1 fed two pulses at tick 0. Without slot
  // capacity, both arrive at the receiver and the second overwrites
  // any prior buffer; with slots:1, the second is held at the source
  // until the first is consumed by a fire.
  const slotEdge: Edge = {
    id: "inToCi",
    source: "in",
    sourceHandle: "out",
    target: "ci",
    targetHandle: "in",
    kind: "chain",
    data: { slots: 1 },
  };
  const spec: Spec = {
    nodes: [
      { id: "in", type: "Input", x: 0, y: 0 },
      { id: "ci", type: "ChainInhibitor", x: 1, y: 0 },
    ],
    edges: [slotEdge],
    timing: {
      seed: [
        { nodeId: "in", outPort: "out", value: 11, atTick: 0 },
        { nodeId: "in", outPort: "out", value: 22, atTick: 0 },
      ],
    },
  };

  it("holds the second emission at the source until the first is consumed", () => {
    const w0 = initWorld(spec);
    expect(w0.queue.length).toBe(1);
    expect(w0.queue[0].value).toBe(11);
    expect(w0.edgePending.inToCi?.length ?? 0).toBe(1);
    expect(w0.edgePending.inToCi[0].value).toBe(22);
    expect(w0.edgeOccupancy.inToCi).toBe(1);
  });

  it("releases the held emission after the receiver fires", () => {
    let w = initWorld(spec);
    w = step(spec, w); // ci.in fires (ChainInhibitor passes through)
    // Slot freed → pending value=22 released onto queue.
    expect(w.queue.some((e) => e.value === 22)).toBe(true);
    expect(w.edgePending.inToCi ?? []).toEqual([]);
    expect(w.edgeOccupancy.inToCi).toBe(1); // the released event now occupies
  });

  it("buffer-and-wait nodes keep the slot occupied until fire", () => {
    // ReadGate: chainIn buffered (no emit), waits for ack to fire.
    const rgSpec: Spec = {
      nodes: [
        { id: "in", type: "Input", x: 0, y: 0 },
        { id: "rg", type: "ReadGate", x: 1, y: 0 },
        { id: "sink", type: "ChainInhibitor", x: 2, y: 0 },
      ],
      edges: [
        {
          id: "inToRg",
          source: "in",
          sourceHandle: "out",
          target: "rg",
          targetHandle: "chainIn",
          kind: "chain",
          data: { slots: 1 },
        },
        edge("rgToSink", "rg", "out", "sink", "in", "chain"),
      ],
      timing: {
        seed: [
          { nodeId: "in", outPort: "out", value: 7, atTick: 0 },
          { nodeId: "in", outPort: "out", value: 8, atTick: 0 },
        ],
      },
    };
    let w = initWorld(rgSpec);
    // First step: chainIn arrives at rg, buffered (no emissions).
    w = step(rgSpec, w);
    // Slot must still be occupied — no ack has arrived, rg hasn't fired.
    expect(w.edgeOccupancy.inToRg).toBe(1);
    expect(w.edgePending.inToRg?.length).toBe(1);
    expect(w.nodeBufferedEdges.rg).toEqual(["inToRg"]);
    // Inject ack so rg fires, which should free the buffered inToRg
    // edge (the ack arrival itself has edgeId=null — synthesized).
    w.queue.push({
      id: w.nextId++,
      readyAt: w.tick,
      edgeId: null,
      fromNodeId: "external",
      fromPort: "ack",
      toNodeId: "rg",
      toPort: "ack",
      value: 1,
    });
    w = step(rgSpec, w);
    // rg fired → inToRg slot freed → pending 8 released.
    expect(w.nodeBufferedEdges.rg ?? []).toEqual([]);
    expect(w.queue.some((e) => e.value === 8 && e.edgeId === "inToRg")).toBe(true);
  });
});

describe("simulator: readGate cycle backpressure (audit row #1)", () => {
  // Mirrors topology.json: in0 → readGate.chainIn (slots:1), readGate
  // → i0 → i1 → readGate.ack (init: [1] to seed the cycle). Three
  // input values [0,1,0] one tick apart. Without slot capacity all
  // three race into the readGate buffer and overwrite. With slots:1
  // on inputToReadGate, value N+1 is held at the source until
  // readGate fires on value N, mirroring the Go ack handshake.
  const cycleSpec: Spec = {
    nodes: [
      { id: "in0", type: "Input", x: 0, y: 0, data: { init: [0, 1, 0] } },
      { id: "readGate", type: "ReadGate", x: 1, y: 0 },
      { id: "i0", type: "ChainInhibitor", x: 2, y: 0 },
      { id: "i1", type: "ChainInhibitor", x: 3, y: 0 },
    ],
    edges: [
      {
        id: "inputToReadGate",
        source: "in0",
        sourceHandle: "out",
        target: "readGate",
        targetHandle: "chainIn",
        kind: "chain",
        data: { slots: 1 },
      },
      edge("readGateToI0", "readGate", "out", "i0", "in", "chain"),
      edge("i0ToI1", "i0", "out", "i1", "in", "chain"),
      {
        id: "i1AckToReadGate",
        source: "i1",
        sourceHandle: "ack",
        target: "readGate",
        targetHandle: "ack",
        kind: "feedback-ack",
        data: { init: [1] },
      },
    ],
  };

  it("holds inputs 2 and 3 at the source until ack handshakes free the slot", () => {
    const w0 = initWorld(cycleSpec);
    // Default Input seeding fans the [0,1,0] init across atTick=0,1,2.
    // Only the atTick=0 seed enters the queue; atTick=1 and atTick=2
    // sit in pendingSeeds (deferred so they don't grab the slot before
    // their emission is due — see initWorld for the rationale).
    const inFlight = w0.queue.filter((e) => e.edgeId === "inputToReadGate").length;
    expect(inFlight).toBe(1);
    expect(w0.pendingSeeds.length).toBe(2);
    expect(w0.edgeOccupancy.inputToReadGate).toBe(1);
  });

  it("delivers all three values to i0 in order across the running cycle", () => {
    let w = initWorld(cycleSpec);
    const i0Arrivals: StateValue[] = [];
    for (let i = 0; i < 200; i++) {
      if (w.queue.length === 0) break;
      const before = w.history.length;
      w = step(cycleSpec, w);
      for (const rec of w.history.slice(before)) {
        if (rec.nodeId === "i0" && rec.inputPort === "in") {
          i0Arrivals.push(rec.inputValue);
        }
      }
    }
    expect(i0Arrivals).toEqual([0, 1, 0]);
    // Pending should fully drain once the cycle has pumped all three.
    expect(w.edgePending.inputToReadGate ?? []).toEqual([]);
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
