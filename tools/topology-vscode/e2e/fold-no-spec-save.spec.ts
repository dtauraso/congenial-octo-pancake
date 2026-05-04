// Tier 3 system-shape: fold gestures must not trigger spec save.
//
// Folds are viewer-only (topology.view.json). The plan-doc rule "topogen
// never re-runs on a fold gesture" depends on every fold action calling
// flushViewSave or scheduleViewSave but never scheduleSave. This test
// enforces that contract end-to-end: gesture in, getSent() out, no
// {type:"save"} should ever appear.
//
// Failure mode this prevents: in a future phase someone (likely me,
// reaching for the documented happy path) adds scheduleSave() to a
// fold-adjacent code path "for safety," silently making fold operations
// modify topology.json and re-run topogen. Without this test, the
// regression is invisible until you notice your Wiring/ package
// changing on fold gestures.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const HERE = __dirname;
const HARNESS_URL = pathToFileURL(resolve(HERE, "harness.html")).toString();

type SentMsg = { type: string; text?: string };

declare global {
  interface Window {
    __wirefold_fixture: string;
    __wirefold_view_fixture?: string;
    __wirefold_sent: SentMsg[];
    __wirefold_test: {
      getSpec: () => unknown;
      getSent: () => SentMsg[];
    };
  }
}

function loadFixture(name: string): string {
  return readFileSync(resolve(HERE, "fixtures", name), "utf-8");
}

test.describe("Tier 3 fold/viewer-only invariant", () => {
  test("fold gestures (create, expand, collapse, delete) post view-save only — never save", async ({ page }) => {
    const fixture = loadFixture("two-node.json");
    // Pre-set selection in the sidecar so the test doesn't depend on UI
    // click-to-select behavior (which is flaky under the palette overlay).
    const viewFixture = JSON.stringify({
      lastSelectionIds: ["in0", "i0"],
    });
    await page.addInitScript(
      ({ spec, view }: { spec: string; view: string }) => {
        window.__wirefold_fixture = spec;
        window.__wirefold_view_fixture = view;
      },
      { spec: fixture, view: viewFixture },
    );
    await page.goto(HARNESS_URL);

    await page.waitForSelector('.react-flow__node[data-id="in0"]');
    await page.waitForSelector('.react-flow__node[data-id="i0"]');

    // Sanity: both nodes should be marked selected after view-load.
    await expect(
      page.locator('.react-flow__node[data-id="in0"].selected'),
    ).toHaveCount(1);
    await expect(
      page.locator('.react-flow__node[data-id="i0"].selected'),
    ).toHaveCount(1);

    // Snapshot the spec at start; no fold action should ever change it.
    const specBefore = await page.evaluate(() =>
      JSON.stringify(window.__wirefold_test.getSpec()),
    );

    // Snapshot sent-message count. Anything fold-related that follows must
    // only push view-save messages, never save.
    const sentCountBefore = await page.evaluate(() =>
      window.__wirefold_test.getSent().length,
    );

    // Right-click on a selected node to fold the selection. Selection was
    // pre-set via the view fixture, so no UI click-to-select flakiness here.
    const n1 = page.locator('.react-flow__node[data-id="i0"]');
    const b1 = await n1.boundingBox();
    if (!b1) throw new Error("node bounding box missing");
    await page.mouse.click(b1.x + b1.width - 4, b1.y + b1.height / 2, {
      button: "right",
    });

    // Wait for the placeholder to appear.
    await page.waitForSelector(".fold-placeholder");

    // Double-click the placeholder to expand.
    await page.locator(".fold-placeholder").dblclick();
    await page.waitForSelector(".fold-frame");

    // Re-collapse via dbl-click on the expanded label tab.
    // The frame body has pointer-events: none; the label tab inside is the
    // only interactive surface.
    const labelTab = page.locator(".fold-frame > div").first();
    await labelTab.dblclick();
    await page.waitForSelector(".fold-placeholder");

    // Delete the placeholder.
    await page.locator(".fold-placeholder").click();
    await page.keyboard.press("Delete");
    await expect(page.locator(".fold-placeholder")).toHaveCount(0);

    // The spec must be byte-identical to the start. Folds touched only the
    // sidecar.
    const specAfter = await page.evaluate(() =>
      JSON.stringify(window.__wirefold_test.getSpec()),
    );
    expect(specAfter).toBe(specBefore);

    // Allow any pending debounced messages to flush so the assertion below
    // sees the steady state, not a race.
    await page.waitForTimeout(500);

    // Every message posted from this gesture sequence must be view-save.
    // {type:"save"} would mean a fold path leaked into the spec-save
    // pipeline — exactly the silent-corrosion failure mode this guards.
    const newMsgs = await page.evaluate(
      (before: number) => window.__wirefold_test.getSent().slice(before),
      sentCountBefore,
    );

    const saveMsgs = newMsgs.filter((m) => m.type === "save");
    expect(saveMsgs, JSON.stringify(newMsgs, null, 2)).toEqual([]);

    // And view-save should have been posted at least once (fold create
    // flushes, so we expect ≥1).
    const viewSaveMsgs = newMsgs.filter((m) => m.type === "view-save");
    expect(viewSaveMsgs.length).toBeGreaterThan(0);
  });
});
