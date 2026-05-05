// Contract C5 (docs/planning/visual-editor/contracts.md):
// `cycle-restart.logStuckPendingOnce` fires only when
// `hasPendingWork(world)` is true, so the warning message
// "queue empty but hasPendingWork=true" matches reality. May-4
// runner-errors-last.json captured a probe whose shape suggested
// the call site could fire under a weaker condition; this test
// pins both directions:
//  - call-site predicate (queue.length===0 && pendingSeeds.length>0)
//    implies hasPendingWork(world) === true.
//  - fully-quiescent world (hasPendingWork===false) does NOT satisfy
//    the call-site predicate, so cycle-restart is taken instead.
// Also pins the once-per-stuck dedup via state.stuckLogged.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logStuckPendingOnce } from "../../src/sim/runner/cycle-restart";
import { hasPendingWork } from "../../src/sim/runner/_init";
import { state } from "../../src/sim/runner/_state";
import type { World } from "../../src/sim/simulator";

function emptyWorld(): World {
  return {
    tick: 0,
    cycle: 0,
    wasQuiescent: true,
    state: {},
    queue: [],
    history: [],
    nextId: 0,
    nextOrd: 0,
    edgeOccupancy: {},
    edgePending: {},
    nodeBufferedEdges: {},
    pendingSeeds: [],
    deferSlotFreeToView: false,
    edgeReleasePending: {},
  };
}

describe("contract C5: stuck-pending precondition", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    state.stuckLogged = false;
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    state.stuckLogged = false;
  });

  it("call-site predicate (queue empty + pendingSeeds nonempty) implies hasPendingWork=true", () => {
    const w = emptyWorld();
    w.pendingSeeds.push({ nodeId: "n", outPort: "o", value: 1, atTick: 5 });
    expect(w.queue.length === 0 && w.pendingSeeds.length > 0).toBe(true);
    expect(hasPendingWork(w)).toBe(true);
  });

  it("fully-quiescent world does NOT satisfy call-site predicate (cycle-restart path is taken)", () => {
    const w = emptyWorld();
    expect(hasPendingWork(w)).toBe(false);
    // Runner tick: queue empty + pendingSeeds empty → scheduleCycleRestart, not log.
    expect(w.queue.length === 0 && w.pendingSeeds.length > 0).toBe(false);
  });

  it("logs once when invoked, then dedups via stuckLogged", () => {
    const w = emptyWorld();
    w.pendingSeeds.push({ nodeId: "n", outPort: "o", value: 1, atTick: 5 });
    logStuckPendingOnce(w);
    logStuckPendingOnce(w);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "[runner] queue empty but hasPendingWork=true",
      expect.objectContaining({ pendingSeeds: 1, nextSeedAtTick: 5 }),
    );
  });

  it("re-arms after stuckLogged is reset (mirrors cycle-restart clearing it on re-seed)", () => {
    const w = emptyWorld();
    w.pendingSeeds.push({ nodeId: "n", outPort: "o", value: 1, atTick: 5 });
    logStuckPendingOnce(w);
    state.stuckLogged = false;
    logStuckPendingOnce(w);
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });
});
