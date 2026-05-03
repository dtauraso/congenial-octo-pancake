// Locks H9: regular-node drag persists x/y back to the spec and posts a
// save. Without onNodeDragStop wiring, dragged nodes snap back on next
// reload because the spec still holds their original coordinates.

import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const HERE = __dirname;
const HARNESS_URL = pathToFileURL(resolve(HERE, "harness.html")).toString();

type Spec = { nodes: { id: string; x: number; y: number }[] };

declare global {
  interface Window {
    __wirefold_fixture: string;
    __wirefold_test: { getSpec: () => Spec; getSent: () => unknown[] };
  }
}

test("dragging a regular node persists new x/y back to the spec and saves", async ({ page }) => {
  const fixture = readFileSync(resolve(HERE, "fixtures/two-node.json"), "utf-8");
  await page.addInitScript((text: string) => { window.__wirefold_fixture = text; }, fixture);
  await page.goto(HARNESS_URL);

  await page.waitForSelector('.react-flow__node[data-id="i0"]');

  const before = await page.evaluate(() =>
    window.__wirefold_test.getSpec().nodes.find((n) => n.id === "i0"));
  if (!before) throw new Error("i0 not in spec");

  const node = page.locator('.react-flow__node[data-id="i0"]');
  const box = await node.boundingBox();
  if (!box) throw new Error("node bbox missing");
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  const dx = 120;
  const dy = -60;

  // Pointer drag the node body. Multi-step move so RF's drag handler binds
  // and tracks the pointer; up triggers onNodeDragStop.
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx / 2, startY + dy / 2, { steps: 5 });
  await page.mouse.move(startX + dx, startY + dy, { steps: 5 });
  await page.mouse.up();

  // Spec.x/y should reflect the drag delta (within RF's grid snap, if any —
  // we don't expect any in this test setup).
  await expect.poll(async () =>
    await page.evaluate(() =>
      window.__wirefold_test.getSpec().nodes.find((n) => n.id === "i0")?.x ?? -1),
  ).toBeGreaterThan(before.x + 10);

  const after = await page.evaluate(() =>
    window.__wirefold_test.getSpec().nodes.find((n) => n.id === "i0"));
  expect(after).toBeDefined();
  expect(after!.x).toBeGreaterThan(before.x + 10);
  expect(after!.y).not.toBe(before.y);

  // Debounced save must have posted with the new coords.
  await expect.poll(async () =>
    await page.evaluate((origX) => {
      const sent = window.__wirefold_test.getSent();
      return sent.some((m) => {
        const msg = m as { type?: string; text?: string };
        if (msg.type !== "save" || !msg.text) return false;
        try {
          const s = JSON.parse(msg.text) as Spec;
          const i0 = s.nodes.find((n) => n.id === "i0");
          return !!i0 && i0.x !== origX;
        } catch { return false; }
      });
    }, before.x),
  ).toBe(true);
});
