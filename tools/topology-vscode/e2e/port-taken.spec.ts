// Locks the load-bearing 1-to-1 input invariant: target ports are exclusive
// per topogen's chan-field model. A second port-drag onto an already-wired
// target must be rejected, not silently overwrite the existing edge.

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
    __wirefold_test: { getSpec: () => Spec; getSent: () => unknown[] };
  }
}

test("port drag onto already-wired target port is rejected", async ({ page }) => {
  const fixture = readFileSync(resolve(HERE, "fixtures/three-node-with-edges.json"), "utf-8");
  await page.addInitScript((text: string) => { window.__wirefold_fixture = text; }, fixture);
  await page.goto(HARNESS_URL);

  await page.waitForSelector('.react-flow__node[data-id="i0"]');
  await page.waitForSelector('.react-flow__node[data-id="i1"]');

  // Initial: 2 edges.
  expect(await page.evaluate(() => window.__wirefold_test.getSpec().edges.length)).toBe(2);

  // i0.in is already wired (by e_in0_i0). Try to drag i1.out -> i0.in.
  const src = page.locator('.react-flow__handle[data-nodeid="i1"][data-handleid="out"]');
  const dst = page.locator('.react-flow__handle[data-nodeid="i0"][data-handleid="in"]');
  await expect(src).toBeVisible();
  await expect(dst).toBeVisible();

  const sb = await src.boundingBox();
  const db = await dst.boundingBox();
  if (!sb || !db) throw new Error("handle bounding box missing");
  const sx = sb.x + sb.width / 2;
  const sy = sb.y + sb.height / 2;
  const tx = db.x + db.width / 2;
  const ty = db.y + db.height / 2;

  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move((sx + tx) / 2, (sy + ty) / 2, { steps: 5 });
  await page.mouse.move(tx, ty, { steps: 5 });
  await page.mouse.up();

  // Give the debounced save a chance to fire if onConnect mistakenly
  // accepted the drop, then assert nothing changed.
  await page.waitForTimeout(400);

  const spec = await page.evaluate(() => window.__wirefold_test.getSpec());
  expect(spec.edges).toHaveLength(2);
  // The original edge must still be intact.
  expect(spec.edges.find((e) => e.id === "e_in0_i0")).toBeDefined();

  // No save with a third edge should have been posted.
  const savedWithThird = await page.evaluate(() =>
    window.__wirefold_test.getSent().some((m) => {
      const msg = m as { type?: string; text?: string };
      if (msg.type !== "save" || !msg.text) return false;
      try {
        const parsed = JSON.parse(msg.text) as { edges: unknown[] };
        return parsed.edges.length > 2;
      } catch {
        return false;
      }
    }),
  );
  expect(savedWithThird).toBe(false);
});
