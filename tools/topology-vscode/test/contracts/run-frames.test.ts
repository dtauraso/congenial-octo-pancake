// Step 7b: pin the runFrames orchestrator. Verifies that:
//  1. Source-only nodes (zero inputs) are skipped without throwing,
//     since 7b has no seed mechanism.
//  2. No external load → no frames paced; recorder stays empty.
//  3. stop() prevents any further paced frames from arriving.

import { describe, expect, it } from "vitest";
import { runFrames } from "../../src/host-shim/run-frames";
import type { Spec } from "../../src/schema";
import type { FrameMsg } from "../../src/messages";
import type { ScheduleFn } from "../../src/renderer/renderer-adapter";
import { _resetSeqForTests } from "../../src/substrate/wire-events";

type Pending = { fn: () => void; cancelled: boolean };
const fakeClock = (): { schedule: ScheduleFn; flush: () => void } => {
  const pending: Pending[] = [];
  const schedule: ScheduleFn = (_ms, fn) => {
    const p: Pending = { fn, cancelled: false };
    pending.push(p);
    return () => { p.cancelled = true; };
  };
  const flush = (): void => {
    while (pending.length > 0) {
      const p = pending.shift()!;
      if (!p.cancelled) p.fn();
    }
  };
  return { schedule, flush };
};

const e = (id: string, src: string, tgt: string): Spec["edges"][number] => ({
  id, source: src, sourceHandle: "o", target: tgt, targetHandle: "i", kind: "signal",
});

describe("runFrames", () => {
  it("skips source-only nodes without throwing", () => {
    _resetSeqForTests();
    const sent: FrameMsg[] = [];
    const clock = fakeClock();
    const spec: Spec = {
      nodes: [{ id: "src", type: "Input" }, { id: "dst", type: "Identity" }],
      edges: [e("e1", "src", "dst")],
    };
    const h = runFrames({
      spec,
      post: (m) => sent.push(m),
      schedule: clock.schedule,
    });
    clock.flush();
    expect(sent).toEqual([]);
    h.stop();
  });

  it("recorder stays empty when no input is loaded externally", () => {
    _resetSeqForTests();
    const clock = fakeClock();
    const h = runFrames({
      spec: {
        nodes: [{ id: "n", type: "Identity" }],
        edges: [e("e1", "src", "n"), e("e2", "n", "sink")],
      },
      post: () => {},
      schedule: clock.schedule,
    });
    clock.flush();
    expect(h.recorder.length()).toBe(0);
    h.stop();
  });

  it("stop() prevents further paced frames", () => {
    _resetSeqForTests();
    const sent: FrameMsg[] = [];
    const clock = fakeClock();
    const h = runFrames({
      spec: { nodes: [], edges: [] },
      post: (m) => sent.push(m),
      schedule: clock.schedule,
    });
    h.stop();
    clock.flush();
    expect(sent).toEqual([]);
  });
});
