// Step 7b proof-out: play / pause / step / resume controls for runFrames.
// Deterministic fake clock; no real sleeps.

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

const spec8 = (): Spec => ({
  nodes: [{ id: "src", type: "Input", data: { init: [0,1,0,1,0,1,0,1] } }, { id: "dst", type: "Identity" }],
  edges: [e("e1", "src", "dst")],
});

const settle = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await new Promise<void>((r) => setTimeout(r, 0));
};

describe("runFrames controls", () => {
  it("emits frames while running", async () => {
    _resetSeqForTests();
    const sent: FrameMsg[] = [];
    const clock = fakeClock();
    const h = runFrames({ spec: spec8(), post: (m) => sent.push(m), schedule: clock.schedule });
    await settle();
    clock.flush();
    expect(sent.length).toBeGreaterThan(0);
    h.stop();
  });

  it("pause() stops further frames from arriving", async () => {
    _resetSeqForTests();
    const sent: FrameMsg[] = [];
    const clock = fakeClock();
    const h = runFrames({ spec: spec8(), post: (m) => sent.push(m), schedule: clock.schedule });
    h.pause();
    expect(h.paused).toBe(true);
    await settle();
    clock.flush();
    const snap = sent.length;
    clock.flush(); // still paused; no new frames
    expect(sent.length).toBe(snap);
    h.stop();
  });

  it("step() delivers exactly one more frame then re-pauses", async () => {
    _resetSeqForTests();
    const sent: FrameMsg[] = [];
    const clock = fakeClock();
    const h = runFrames({ spec: spec8(), post: (m) => sent.push(m), schedule: clock.schedule });
    h.pause();
    await settle();
    clock.flush();
    const before = sent.length;
    h.step();
    await settle();
    clock.flush();
    expect(sent.length).toBe(before + 1);
    expect(h.paused).toBe(true);
    h.stop();
  });

  it("resume() allows frames to flow again after pause", async () => {
    _resetSeqForTests();
    const sent: FrameMsg[] = [];
    const clock = fakeClock();
    const h = runFrames({ spec: spec8(), post: (m) => sent.push(m), schedule: clock.schedule });
    h.pause();
    await settle();
    clock.flush();
    const before = sent.length;
    h.resume();
    expect(h.paused).toBe(false);
    await settle();
    clock.flush();
    expect(sent.length).toBeGreaterThan(before);
    h.stop();
  });
});
