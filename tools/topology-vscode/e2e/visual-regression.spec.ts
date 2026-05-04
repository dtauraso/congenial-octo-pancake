import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

// Tier 4 visual regression. One fixture per `route` kind plus a notes /
// legend / open-arrow combo, screenshotted at a fixed viewport. Baseline
// PNGs live under e2e/visual-regression.spec.ts-snapshots/. Refresh with
// `npx playwright test visual-regression --update-snapshots` after an
// intentional rendering change.
//
// Flake control:
// - `disableAnimations` freezes CSS transitions (RF fitView is one).
// - The runner is event-driven; with no seed events the AnimatedEdge
//   pulse never fires, so the captured frame is static.
// - Tolerance is set in playwright.config.ts so all visual specs share
//   a single threshold. The pinned-CI-image part of the brief is a
//   harness concern, not a code one — see the README note on Docker.

const HERE = __dirname;
const HARNESS_URL = pathToFileURL(resolve(HERE, "harness.html")).toString();

declare global {
  interface Window {
    __wirefold_fixture: string;
  }
}

function loadFixture(name: string): string {
  return readFileSync(resolve(HERE, "fixtures", name), "utf-8");
}

async function loadAndSettle(page: import("@playwright/test").Page, fixture: string) {
  await page.addInitScript((text: string) => {
    window.__wirefold_fixture = text;
  }, fixture);
  await page.goto(HARNESS_URL);
  // Wait for RF to mount and fitView to land; the viewport DOM appears
  // once the first node mounts.
  await page.waitForSelector(".react-flow__node");
  await page.waitForSelector(".react-flow__edge-path", { state: "attached" });
  // RF's fitView is synchronous after layout, but allow one rAF for the
  // viewport transform to settle before sampling pixels.
  await page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );
}

test.describe("Tier 4 visual regression", () => {
  test("route=line renders a straight default edge", async ({ page }) => {
    await loadAndSettle(page, loadFixture("route-line.json"));
    await expect(page.locator("#app")).toHaveScreenshot("route-line.png");
  });

  test("route=snake renders Manhattan with lane offset and open arrow", async ({ page }) => {
    await loadAndSettle(page, loadFixture("route-snake.json"));
    await expect(page.locator("#app")).toHaveScreenshot("route-snake.png");
  });

  test("route=below renders corridor with notes + legend", async ({ page }) => {
    await loadAndSettle(page, loadFixture("route-below.json"));
    await expect(page.locator("#app")).toHaveScreenshot("route-below.png");
  });
});
