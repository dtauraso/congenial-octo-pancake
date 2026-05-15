// Tier 3 gesture: an in-flight value label rides alongside the pulse
// dot when the runner emits on an edge. The riding label is a <text>
// element rendered by Wire.tsx next to the pulse circle. Wire uses RAF
// animation (not WAAPI), so we assert on the label's text content and
// the presence of the element while the wire is in-flight, not on WAAPI
// animation count.

import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const HERE = __dirname;
const HARNESS_URL = pathToFileURL(resolve(HERE, "harness.html")).toString();

test("emit on an edge shows a value label that rides the pulse", async ({ page }) => {
  const fixture = readFileSync(resolve(HERE, "fixtures/riding-label.json"), "utf-8");
  await page.addInitScript((text: string) => { window.__wirefold_fixture = text; }, fixture);
  await page.goto(HARNESS_URL);

  await page.waitForSelector('.timeline-panel');

  // The substrate driver is running by default (not halted on mount).
  // The Input node's queue [7] fires immediately. Poll for the
  // riding-label text element on wire ciToCi2 while the pulse is in-flight.
  // Plain scalar values render as String(value) in formatRidingLabel.
  const observed = await page.evaluate(async () => {
    const sel = '[data-testid="riding-label-ciToCi2"]';
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const el = document.querySelector(sel) as SVGTextElement | null;
      if (el) {
        const text = el.textContent ?? "";
        if (text !== "") {
          return { text };
        }
      }
      await new Promise((r) => setTimeout(r, 16));
    }
    return null;
  });

  expect(observed, "expected a mid-flight riding label on ciToCi2").not.toBeNull();
  // ChainInhibitor ci passes the consumed value (7) through to ciToCi2.
  expect(observed!.text).toBe("7");
});

declare global {
  interface Window {
    __wirefold_fixture: string;
  }
}
