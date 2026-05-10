// Shape D contract: with the cycle closed (i0.out -> i1.in) and i1
// fanning out to both readGate.chainIn and readGate.ack, neither cycle
// edge may ever observe a second onArrive before its prior onAck.
// "No pulse stacking" is the invariant. in0 is now a one-shot seed
// (not a per-cycle external feed); both chainIn and ack are fed by
// i1's fan-out. The visual layer's arc-completion auto-ack stand-in
// covers the two non-feedback cycle edges (readGate->i0, i0->i1). The
// two feedback edges (i1->readGate.ack, in0->readGate.chainIn) are
// consumed atomically inside readGate's andGateLoopWithCycleInputs,
// so no external ack listener is needed for them.
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

    // Visual-layer arc-completion stand-in. Use macrotask pacing
    // (setTimeout(0)) instead of queueMicrotask so the loops can't
    // starve the test's await tick(). ackEdge is self-acked by the
    // substrate (cycle feedback); we do NOT auto-ack it here.
    // All cycle edges self-ack via consume-on-read inside the loops.
    // The fan-out node provides one macrotask yield per round-trip;
    // no per-edge external autoAck is needed (would only no-op).

    // ackEdge is seeded at startup; the seed's onArrive fires before
    // these listeners attach. Compensate so depth tracking lines up.
    let ackDepth = ackEdge.state === "inFlight" ? 1 : 0;
    let ackArrives = ackDepth; let ackAcks = 0; let ackMax = ackDepth;
    let cycDepth = 0; let cycMax = 0; let cycArrives = 0; let cycAcks = 0;
    ackEdge.onArrive(() => { ackDepth += 1; if (ackDepth > ackMax) ackMax = ackDepth; ackArrives += 1; });
    ackEdge.onAck(() => { ackDepth -= 1; ackAcks += 1; });
    cycleEdge.onArrive(() => { cycDepth += 1; if (cycDepth > cycMax) cycMax = cycDepth; cycArrives += 1; });
    cycleEdge.onAck(() => { cycDepth -= 1; cycAcks += 1; });

    // Self-pumping: no manual-ack edges. Just yield ticks until the
    // suite is satisfied (>=3 round-trips quiesced) or the safety
    // budget runs out.
    let safety = 0;
    while (safety < 200 && (ackArrives < 3 || cycArrives < 3)) {
      await tick();
      safety += 1;
    }

    // The cycle is self-pumping: ackEdge holds a token between cycles
    // (inFlight at most macrotask boundaries) and only goes idle for
    // microtasks while readGate cycle-acks. Depth ≤ 1 is the invariant.
    // Each arrive is matched by an ack within ±1 (the in-flight token).
    expect(rgTicks).toBeGreaterThanOrEqual(3);
    expect(ackArrives).toBeGreaterThanOrEqual(3);
    expect(cycArrives).toBeGreaterThanOrEqual(3);
    expect(ackMax).toBeLessThanOrEqual(1);
    expect(cycMax).toBeLessThanOrEqual(1);
    expect(Math.abs(ackArrives - ackAcks)).toBeLessThanOrEqual(1);
    expect(Math.abs(cycArrives - cycAcks)).toBeLessThanOrEqual(1);

    await stopWiresRuntime();
    off();
  });
});
