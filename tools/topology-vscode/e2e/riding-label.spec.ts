// Tier 3 gesture: an in-flight value label rides alongside the pulse
// dot when the runner emits on an edge. Mirrors the SVG vocabulary in
// diagrams/topology-animated.svg where co-animated <text> elements
// follow the pulse path. Asserts presence + content + that a WAAPI
// animation is running, not mid-flight pixel position (would flake).

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

  // SVG <text> with opacity 0 isn't reliably "visible" to Playwright,
  // and pulses are short (~200–1200ms) so toBeVisible races the
  // animation. Instead, capture the riding label's content the
  // moment a pulse is mid-flight by polling synchronously after play.
  await page.locator('.timeline-play').click();

  const observed = await page.evaluate(async () => {
    const sel = '[data-testid="riding-label-ciToCi2"]';
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      const el = document.querySelector(sel) as SVGTextElement | null;
      if (el) {
        const text = el.textContent ?? "";
        const anims = el.getAnimations().length;
        if (text !== "" && anims > 0) {
          return { text, anims };
        }
      }
      await new Promise((r) => setTimeout(r, 16));
    }
    return null;
  });

  expect(observed, "expected a mid-flight riding label").not.toBeNull();
  // ci's held=0 is emitted on `out` when input 7 arrives.
  expect(observed!.text).toBe("0");
  expect(observed!.anims).toBeGreaterThan(0);
});

declare global {
  interface Window {
    __wirefold_fixture: string;
  }
}
