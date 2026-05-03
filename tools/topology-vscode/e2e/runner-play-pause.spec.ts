// Phase 5.5 Chunk C smoke test: the per-node-event runner replaces the
// master clock. Loading a spec with a `timing.seed` should populate the
// simulator queue; clicking play should advance the tick label; pause
// should freeze it. The label is the simplest cross-bundle observable
// since runner state lives inside the webview module.

import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const HERE = __dirname;
const HARNESS_URL = pathToFileURL(resolve(HERE, "harness.html")).toString();

test("runner: play advances tick, pause freezes it", async ({ page }) => {
  const fixture = readFileSync(resolve(HERE, "fixtures/runner-smoke.json"), "utf-8");
  await page.addInitScript((text: string) => { window.__wirefold_fixture = text; }, fixture);
  await page.goto(HARNESS_URL);

  await page.waitForSelector('.timeline-panel');
  const label = page.locator('.timeline-time');
  // At rest the label reads "tick 0 · cycle 0 · queued N" (N>0 because
  // seed events are queued).
  await expect(label).toContainText('cycle 0');
  await expect(label).toContainText('queued 3');

  // Click play; the simulator should drain the queue (cycle advances).
  await page.locator('.timeline-play').click();
  await expect(label).toContainText('queued 0', { timeout: 2000 });
  await expect(label).not.toContainText('cycle 0');
  const advancedText = await label.textContent();

  // Pause; tick label should not change after that.
  await page.locator('.timeline-play').click();
  // Give the interval a chance to fire — if pause didn't take, label
  // would change in the next 500ms.
  await page.waitForTimeout(500);
  expect(await label.textContent()).toBe(advancedText);
});

declare global {
  interface Window {
    __wirefold_fixture: string;
  }
}
