// Contract tests for the shared pause controller. Pins:
//   1. Back-to-back pause/resume cycles each unblock waiters exactly
//      once, with no leakage between cycles.
//   2. Multiple subscribers to awaitResume / awaitPause are all
//      released on the matching transition.
//   3. paused flag observably tracks the last call.
//   4. Idempotent: pause() while paused and resume() while running
//      are no-ops (do not spuriously wake waiters).

import { describe, expect, it } from "vitest";
import { createPauseController } from "../../src/substrate/pause-controller";

const tick = () => new Promise<void>((r) => setImmediate(r));

describe("pause-controller — back-to-back pause/resume", () => {
  it("releases resume waiters across multiple cycles", async () => {
    const ctrl = createPauseController();
    const log: string[] = [];

    ctrl.pause();
    expect(ctrl.paused).toBe(true);
    const w1 = ctrl.awaitResume().then(() => log.push("r1"));
    ctrl.resume();
    await w1;
    expect(ctrl.paused).toBe(false);

    ctrl.pause();
    const w2 = ctrl.awaitResume().then(() => log.push("r2"));
    ctrl.resume();
    await w2;

    expect(log).toEqual(["r1", "r2"]);
  });

  it("awaitResume resolves immediately when not paused", async () => {
    const ctrl = createPauseController();
    let done = false;
    await ctrl.awaitResume().then(() => {
      done = true;
    });
    expect(done).toBe(true);
  });

  it("awaitPause resolves immediately when already paused", async () => {
    const ctrl = createPauseController();
    ctrl.pause();
    let done = false;
    await ctrl.awaitPause().then(() => {
      done = true;
    });
    expect(done).toBe(true);
  });
});

describe("pause-controller — multiple subscribers", () => {
  it("releases all awaitResume waiters on a single resume()", async () => {
    const ctrl = createPauseController();
    ctrl.pause();
    const log: number[] = [];
    const ws = [1, 2, 3].map((i) =>
      ctrl.awaitResume().then(() => log.push(i)),
    );
    ctrl.resume();
    await Promise.all(ws);
    expect(log.sort()).toEqual([1, 2, 3]);
  });

  it("releases all awaitPause waiters on a single pause()", async () => {
    const ctrl = createPauseController();
    const log: number[] = [];
    const ws = [1, 2, 3].map((i) =>
      ctrl.awaitPause().then(() => log.push(i)),
    );
    ctrl.pause();
    await Promise.all(ws);
    expect(log.sort()).toEqual([1, 2, 3]);
  });
});

describe("pause-controller — idempotency", () => {
  it("pause() while paused does not wake resume waiters", async () => {
    const ctrl = createPauseController();
    ctrl.pause();
    let woke = false;
    void ctrl.awaitResume().then(() => {
      woke = true;
    });
    ctrl.pause();
    await tick();
    expect(woke).toBe(false);
    ctrl.resume();
    await tick();
    expect(woke).toBe(true);
  });

  it("resume() while running does not wake pause waiters", async () => {
    const ctrl = createPauseController();
    let woke = false;
    void ctrl.awaitPause().then(() => {
      woke = true;
    });
    ctrl.resume();
    await tick();
    expect(woke).toBe(false);
    ctrl.pause();
    await tick();
    expect(woke).toBe(true);
  });
});
