// @vitest-environment happy-dom
// Contract test: substrate runtime is ack-driven (cap=0 unbuffered).
// Each emit waits for the previous pulse-ack before sending the next
// token. edge-ready unlocks the first emit. pause/resume during an
// in-flight pulse must not duplicate the token.

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import type { Spec } from "../../src/schema";

// substrate/runtime.ts → substrate/log.ts → webview/save.ts calls
// acquireVsCodeApi() at module load. Stub before importing.
beforeAll(() => {
  (globalThis as unknown as { acquireVsCodeApi: () => unknown }).acquireVsCodeApi = () => ({
    postMessage: () => {},
    setState: () => {},
    getState: () => null,
  });
  document.body.innerHTML = `<div id="status"></div><div id="topogen-status"></div>`;
});

let notify: typeof import("../../src/sim/event-bus").notify;
let subscribe: typeof import("../../src/sim/event-bus").subscribe;
type RunnerEvent = import("../../src/sim/event-bus").RunnerEvent;
type EmitEvent = import("../../src/sim/event-bus").EmitEvent;
let loadSubstrate: typeof import("../../src/substrate/runtime").loadSubstrate;
let stopSubstrate: typeof import("../../src/substrate/runtime").stopSubstrate;
let pauseSubstrate: typeof import("../../src/substrate/runtime").pauseSubstrate;
let resumeSubstrate: typeof import("../../src/substrate/runtime").resumeSubstrate;
let isSubstrateRunning: typeof import("../../src/substrate/runtime").isSubstrateRunning;

beforeAll(async () => {
  const bus = await import("../../src/sim/event-bus");
  notify = bus.notify;
  subscribe = bus.subscribe;
  const runtime = await import("../../src/substrate/runtime");
  loadSubstrate = runtime.loadSubstrate;
  stopSubstrate = runtime.stopSubstrate;
  pauseSubstrate = runtime.pauseSubstrate;
  resumeSubstrate = runtime.resumeSubstrate;
  isSubstrateRunning = runtime.isSubstrateRunning;
});

const SPEC: Spec = {
  nodes: [
    { id: "in", type: "Input", data: { init: [0, 1] } },
    { id: "rg", type: "ReadGate" },
  ],
  edges: [{
    id: "in.out->rg.chainIn",
    source: "in", sourceHandle: "out",
    target: "rg", targetHandle: "chainIn",
    kind: "chain",
  }],
};
const EDGE_ID = "in.out->rg.chainIn";

function captureEmits(): { emits: EmitEvent[]; unsub: () => void } {
  const emits: EmitEvent[] = [];
  const unsub = subscribe((ev: RunnerEvent) => {
    if (ev.type === "emit") emits.push(ev);
  });
  return { emits, unsub };
}

function fakeAck(pulseId: string): void {
  notify({ type: "pulse-ack", edgeId: EDGE_ID, pulseId });
}

function fakeEdgeReady(): void {
  notify({ type: "edge-ready", edgeId: EDGE_ID });
}

beforeEach(() => {
  stopSubstrate();
});

describe("substrate ack-driven contract", () => {
  it("waits for edge-ready before emitting the first token", () => {
    const { emits, unsub } = captureEmits();
    loadSubstrate(SPEC);
    expect(emits).toHaveLength(0);
    fakeEdgeReady();
    expect(emits).toHaveLength(1);
    expect(emits[0].value).toBe(0);
    unsub();
  });

  it("emits the next token only on pulse-ack (cap=0 back-pressure)", () => {
    const { emits, unsub } = captureEmits();
    loadSubstrate(SPEC);
    fakeEdgeReady();
    expect(emits).toHaveLength(1);
    // No second emit until ack arrives.
    expect(emits).toHaveLength(1);
    fakeAck(emits[0].pulseId);
    expect(emits).toHaveLength(2);
    expect(emits[1].value).toBe(1);
    unsub();
  });

  it("refills the queue from spec.init when drained, looping forever", () => {
    const { emits, unsub } = captureEmits();
    loadSubstrate(SPEC);
    fakeEdgeReady();
    fakeAck(emits[0].pulseId);
    fakeAck(emits[1].pulseId);
    // After [0,1] drained, queue refills from spec.init -> emit 0 again.
    expect(emits).toHaveLength(3);
    expect(emits[2].value).toBe(0);
    unsub();
  });

  it("pause halts emission on subsequent ack", () => {
    const { emits, unsub } = captureEmits();
    loadSubstrate(SPEC);
    fakeEdgeReady();
    expect(emits).toHaveLength(1);
    pauseSubstrate();
    expect(isSubstrateRunning()).toBe(false);
    // Ack while paused must not advance.
    fakeAck(emits[0].pulseId);
    expect(emits).toHaveLength(1);
    unsub();
  });

  it("resume after ack-while-paused emits the next token", () => {
    const { emits, unsub } = captureEmits();
    loadSubstrate(SPEC);
    fakeEdgeReady();
    pauseSubstrate();
    fakeAck(emits[0].pulseId);  // ack arrives during pause; ignored
    expect(emits).toHaveLength(1);
    resumeSubstrate();
    // Resume kicks the ack-driven loop back on since nothing's in flight.
    expect(emits).toHaveLength(2);
    expect(emits[1].value).toBe(1);
    unsub();
  });

  it("resume during an in-flight pulse does NOT duplicate the token", () => {
    const { emits, unsub } = captureEmits();
    loadSubstrate(SPEC);
    fakeEdgeReady();
    expect(emits).toHaveLength(1);
    // Pulse is in flight (no ack yet). User pauses then resumes.
    pauseSubstrate();
    resumeSubstrate();
    // No new emit — substrate must wait for the in-flight ack.
    expect(emits).toHaveLength(1);
    // Ack arrives, normal cadence resumes.
    fakeAck(emits[0].pulseId);
    expect(emits).toHaveLength(2);
    unsub();
  });
});
