// Tier 3 gesture: rename to a clashing id rejects with an inline error
// (window.alert) and leaves the spec untouched. Complement to
// test/rename.test.ts (which covers applyRename's reject-on-clash at unit
// level) — this asserts the gesture path from dblclick → Enter → alert
// works end-to-end in the live webview.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const HERE = __dirname;
const HARNESS_URL = pathToFileURL(resolve(HERE, "harness.html")).toString();

type Spec = { nodes: { id: string }[]; edges: { id: string }[] };

declare global {
  interface Window {
    __wirefold_fixture: string;
    __wirefold_view_fixture?: string;
    __wirefold_test: { getSpec: () => Spec };
  }
}

test.describe("Tier 3 gestures", () => {
  test("rename to a clashing id rejects with alert and leaves spec untouched", async ({ page }) => {
    const fixture = readFileSync(
      resolve(HERE, "fixtures", "three-node-with-edges.json"),
      "utf-8",
    );
    await page.addInitScript((text: string) => {
      window.__wirefold_fixture = text;
    }, fixture);
    await page.goto(HARNESS_URL);

    await page.waitForSelector('.react-flow__node[data-id="i0"]');

    const specBefore = await page.evaluate(() =>
      JSON.stringify(window.__wirefold_test.getSpec()),
    );

    // Capture window.alert; rename.ts uses alert for the rejection message.
    const alerts: string[] = [];
    page.on("dialog", async (d) => {
      alerts.push(d.message());
      await d.dismiss();
    });

    // Dbl-click the i0 node via raw mouse so the dblclick event reaches RF
    // through the same path the live editor uses. Locator.dblclick() didn't
    // trigger onNodeDoubleClick under the harness — likely an event-shape
    // mismatch with RF's listener binding.
    const i0Wrapper = page.locator('.react-flow__node[data-id="i0"]');
    const wb = await i0Wrapper.boundingBox();
    if (!wb) throw new Error("i0 wrapper bounding box missing");
    const cx = wb.x + wb.width - 4;
    const cy = wb.y + wb.height / 2;
    await page.mouse.dblclick(cx, cy);

    const i0Label = page.locator('.react-flow__node[data-id="i0"] .node-label');

    // The label becomes contenteditable when rename is active.
    await expect(i0Label).toHaveAttribute("contenteditable", "plaintext-only");

    // Replace the label text with the clashing id ("i1" already exists in
    // the fixture). Direct textContent set is more reliable than keyboard
    // selectAll+type, which races against contenteditable focus / browser
    // shortcut interpretation.
    await i0Label.evaluate((el) => {
      el.textContent = "i1";
    });
    await page.keyboard.press("Enter");

    // The alert handler should have captured the rejection.
    await expect.poll(() => alerts.length).toBeGreaterThan(0);
    expect(alerts[0]).toMatch(/rename rejected/i);

    // The spec must be byte-identical: rejection means no mutation.
    const specAfter = await page.evaluate(() =>
      JSON.stringify(window.__wirefold_test.getSpec()),
    );
    expect(specAfter).toBe(specBefore);
  });
});
