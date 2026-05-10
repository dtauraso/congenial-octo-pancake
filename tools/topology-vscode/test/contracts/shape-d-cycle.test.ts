// Shape D contract: with the cycle closed (i0.out -> i1.in), neither
// i1->readGate.ack nor i0->i1 may ever observe a second onArrive
// before its prior onAck. "No pulse stacking" is the invariant. We
// drive the one external-feed edge (in0->readGate.chainIn) with the
// editor's ClearSlot cadence, and stand in for the visual layer's
// arc-completion auto-ack on the two non-feedback cycle edges
// (readGate->i0, i0->i1). The feedback edge i1->readGate.ack is
// consumed atomically inside readGate's andGateLoopWithCycleInputs,
// so no external ack listener is needed for it.
//
// History: an earlier finding (2026-05-09) said Shape D sustained
// only one cycle because ackWireE had no perpetual driver. Real cause
// was that readGate's step-D awaitReady on its feedback inbound was
// being satisfied by external auto-ack draining i1's cycle-2 token
// before readGate's next step-A awaitValue could read it. Switching
// readGate to consume-on-read on the feedback edge fixed it.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseSpec } from "../../src/schema";
import {
  startWiresRuntime, stopWiresRuntime, getWiresMap,
  clearManualAckSlot, subscribeNodeTicks,
} from "../../src/substrate/runtime-wires";
import { ackWire } from "../../src/substrate/wire";

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe("Shape D cycle: no pulse stacking on cycle/ack edges", () => {
  it("ackEdge and cycleEdge see depth <= 1 with arrives matched by acks", async () => {
    const text = readFileSync(
      resolve(__dirname, "../../../../topology.json"),
      "utf8",
    );
    const spec = parseSpec(JSON.parse(text));

    let rgTicks = 0;
    const off = subscribeNodeTicks((id) => { if (id === "readGate1") rgTicks += 1; });

    await startWiresRuntime(spec);
    const wires = getWiresMap()!;
    const inEdge = wires.get("in0.out->readGate.chainIn")!;
    const ackEdge = wires.get("i1.out->readGate.ack")!;
    const outEdge = wires.get("readGate.out->i0.in")!;
    const cycleEdge = wires.get("i0.out->i1.in")!;

    // Stand-in for the visual layer's arc-completion auto-ack on the
    // two non-manual edges. queueMicrotask so the no-stacking observer
    // counts the pulse before the wire returns to idle.
    outEdge.onArrive(() => queueMicrotask(() => {
      if (outEdge.state === "inFlight") ackWire(outEdge);
    }));
    cycleEdge.onArrive(() => queueMicrotask(() => {
      if (cycleEdge.state === "inFlight") ackWire(cycleEdge);
    }));

    let ackDepth = 0; let ackMax = 0; let ackArrives = 0; let ackAcks = 0;
    let cycDepth = 0; let cycMax = 0; let cycArrives = 0; let cycAcks = 0;
    ackEdge.onArrive(() => { ackDepth += 1; if (ackDepth > ackMax) ackMax = ackDepth; ackArrives += 1; });
    ackEdge.onAck(() => { ackDepth -= 1; ackAcks += 1; });
    cycleEdge.onArrive(() => { cycDepth += 1; if (cycDepth > cycMax) cycMax = cycDepth; cycArrives += 1; });
    cycleEdge.onAck(() => { cycDepth -= 1; cycAcks += 1; });

    // Drive the external-feed manual-ack edge as the editor's
    // ClearSlot button would. Bounded poll: keep pacing until at
    // least three full round-trips have completed and quiesced, or
    // until the safety budget runs out. Three proves self-pumping
    // without making the test brittle to micro-timing.
    let safety = 0;
    while (safety < 200 && (ackArrives < 3 || cycArrives < 3 || ackDepth !== 0 || cycDepth !== 0)) {
      if (inEdge.state === "inFlight") clearManualAckSlot("in0.out->readGate.chainIn");
      await tick();
      safety += 1;
    }

    expect(rgTicks).toBeGreaterThanOrEqual(3);
    expect(ackArrives).toBeGreaterThanOrEqual(3);
    expect(cycArrives).toBeGreaterThanOrEqual(3);
    expect(ackMax).toBeLessThanOrEqual(1);
    expect(cycMax).toBeLessThanOrEqual(1);
    expect(ackDepth).toBe(0);
    expect(cycDepth).toBe(0);
    expect(ackArrives).toBe(ackAcks);
    expect(cycArrives).toBe(cycAcks);

    await stopWiresRuntime();
    off();
  });
});
