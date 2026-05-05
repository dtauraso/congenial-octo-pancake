// @vitest-environment happy-dom
//
// Regression: view-save must not fire before view-load has been processed.
//
// History: task/view-load-race-guard. After audit-15 moved positions off the
// spec onto viewerState.{nodes,edges}, an early scheduleViewSave (e.g. from
// React Flow's initial onMoveEnd, before view-load arrived) serialized an
// empty viewerState and clobbered the sidecar — destroying every persisted
// position. Both topology.json and topology.view.json had to be restored
// from HEAD. The gate is `lastViewSyncedText === undefined` until
// markViewSynced is called from handleViewLoad.

import { beforeEach, describe, expect, it, vi } from "vitest";

// save.ts calls acquireVsCodeApi() and getElementById("status"/"topogen-status")
// at module load. Stub before the dynamic import.
beforeEach(() => {
  vi.resetModules();
  (globalThis as unknown as { acquireVsCodeApi: () => unknown }).acquireVsCodeApi = () => ({
    postMessage: () => {},
    setState: () => {},
    getState: () => null,
  });
  (window as unknown as { __vscodeApi?: unknown }).__vscodeApi = undefined;
  document.body.innerHTML = `<div id="status"></div><div id="topogen-status"></div>`;
});

describe("view-save load gate", () => {
  it("scheduleViewSave is a no-op before markViewSynced", async () => {
    const save = await import("../../src/webview/save");
    const schedule = vi.fn();
    save.registerSavers(
      { schedule: vi.fn(), flush: vi.fn() },
      { schedule, flush: vi.fn() },
    );
    save.scheduleViewSave();
    expect(schedule).not.toHaveBeenCalled();
  });

  it("performViewSave is a no-op before markViewSynced", async () => {
    const save = await import("../../src/webview/save");
    const posted: unknown[] = [];
    (window as unknown as { __vscodeApi: { postMessage: (m: unknown) => void } })
      .__vscodeApi.postMessage = (m) => posted.push(m);
    save.performViewSave();
    expect(posted).toEqual([]);
  });

  it("scheduleViewSave fires once markViewSynced has been called", async () => {
    const save = await import("../../src/webview/save");
    const schedule = vi.fn();
    save.registerSavers(
      { schedule: vi.fn(), flush: vi.fn() },
      { schedule, flush: vi.fn() },
    );
    save.markViewSynced("{}");
    save.scheduleViewSave();
    expect(schedule).toHaveBeenCalledOnce();
  });
});
