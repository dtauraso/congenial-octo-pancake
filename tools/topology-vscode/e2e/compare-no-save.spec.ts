// Tier 2 invariant (Phase 5): only the *live* pane talks to topogen — the
// comparison pane never fires {type:"save"}. Switches to A-other, attempts
// gestures that would normally mutate the live spec, asserts no save was
// posted.
//
// Failure mode this prevents: a future change wires comparison-side
// gestures to the same scheduleSave path as live. Without this test, the
// regression is invisible until you notice topogen running with a HEAD
// spec — which by then has already overwritten Wiring/.

import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const HERE = __dirname;
const HARNESS_URL = pathToFileURL(resolve(HERE, "harness.html")).toString();

type SentMsg = { type: string };

declare global {
  interface Window {
    __wirefold_fixture: string;
    __wirefold_view_fixture?: string;
    __wirefold_sent: SentMsg[];
    __wirefold_test: { getSent: () => SentMsg[] };
  }
}

test.describe("Phase 5 — comparison-side save invariant", () => {
  test("comparison-side gestures never post {type:\"save\"}", async ({ page }) => {
    const live = readFileSync(resolve(HERE, "fixtures", "compare-live.json"), "utf-8");
    const other = readFileSync(resolve(HERE, "fixtures", "compare-other.json"), "utf-8");
    await page.addInitScript((spec: string) => {
      window.__wirefold_fixture = spec;
    }, live);
    await page.goto(HARNESS_URL);
    await page.waitForSelector('.react-flow__node[data-id="a"]');
    await page.waitForSelector('.react-flow__node[data-id="b"]');

    // Drive the comparison spec in via postMessage — same path the host
    // would use after `git show HEAD:topology.json`.
    await page.evaluate((text: string) => {
      window.postMessage(
        { type: "compare-load", source: "file", text, label: "fixtures/compare-other.json" },
        "*",
      );
    }, other);

    // After compare-load, default mode is A-live; switch to A-other so any
    // gesture is firing against the comparison spec's view, not live.
    await page.locator(".compare-mode", { hasText: "A · other" }).click();
    // Re-derived from the comparison spec — node "c" is unique to it.
    // Use `attached` not `visible` because RF's viewport may have c off-
    // screen at default zoom; presence in the DOM is enough proof we
    // switched to A-other.
    await page.waitForSelector('.react-flow__node[data-id="c"]', { state: "attached" });

    // Snapshot sent count from after compare-load + mode switch (those
    // shouldn't post any save messages either, but pin the line so the
    // assertion targets only the gesture-driven aftermath).
    const sentBefore = await page.evaluate(() => window.__wirefold_test.getSent().length);

    // Attempt: try to drag node "a" (still on-screen at the live coords).
    // onNodeDragStop early-returns in A-other, so the spec must not
    // change and no save must be posted. A single mutating gesture is
    // enough to prove the invariant — the early-return guard sits on the
    // shared isReadOnlyView() check, so any one handler that fires through
    // it would leak save messages.
    const a = page.locator('.react-flow__node[data-id="a"]');
    const ab = await a.boundingBox();
    if (!ab) throw new Error("node a bounding box missing");
    await page.mouse.move(ab.x + ab.width / 2, ab.y + ab.height / 2);
    await page.mouse.down();
    await page.mouse.move(ab.x + ab.width / 2 + 80, ab.y + ab.height / 2 + 40);
    await page.mouse.up();

    // Allow any debounced messages to flush; then assert no save fired.
    await page.waitForTimeout(500);
    const newMsgs: SentMsg[] = await page.evaluate(
      (before: number) => window.__wirefold_test.getSent().slice(before),
      sentBefore,
    );
    const saveMsgs = newMsgs.filter((m) => m.type === "save");
    expect(saveMsgs, JSON.stringify(newMsgs, null, 2)).toEqual([]);
  });
});
