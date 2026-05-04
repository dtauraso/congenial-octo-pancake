// Phase 6 Chunk B Tier 3 system-shape: paused drag on a motion-bearing
// node (Partition) rewrites props.slidePx/slideDy, leaving base x/y
// untouched. Locks down the rule that "I dragged this here" means
// "adjust the per-phase slide rule," not "move the origin."

import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const HERE = __dirname;
const HARNESS_URL = pathToFileURL(resolve(HERE, "harness.html")).toString();

type Node = {
  id: string;
  x: number;
  y: number;
  props?: Record<string, number>;
};
type Spec = { nodes: Node[] };

declare global {
  interface Window {
    __wirefold_fixture: string;
    __wirefold_test: { getSpec: () => Spec; getSent: () => unknown[] };
  }
}

test("paused drag on a Partition node writes props, not x/y", async ({ page }) => {
  const fixture = readFileSync(resolve(HERE, "fixtures/partition-node.json"), "utf-8");
  await page.addInitScript((text: string) => { window.__wirefold_fixture = text; }, fixture);
  await page.goto(HARNESS_URL);

  await page.waitForSelector('.react-flow__node[data-id="p0"]');

  const before = await page.evaluate(() =>
    window.__wirefold_test.getSpec().nodes.find((n) => n.id === "p0"));
  if (!before) throw new Error("p0 not in spec");

  // Runner defaults to paused; no play click needed.
  const node = page.locator('.react-flow__node[data-id="p0"]');
  const box = await node.boundingBox();
  if (!box) throw new Error("node bbox missing");
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  const dx = 80;
  const dy = -40;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx / 2, startY + dy / 2, { steps: 5 });
  await page.mouse.move(startX + dx, startY + dy, { steps: 5 });
  await page.mouse.up();

  await expect.poll(async () =>
    await page.evaluate(() => {
      const n = window.__wirefold_test.getSpec().nodes.find((x) => x.id === "p0");
      return n?.props?.slidePx ?? null;
    }),
  ).not.toBeNull();

  const after = await page.evaluate(() =>
    window.__wirefold_test.getSpec().nodes.find((n) => n.id === "p0"));
  expect(after).toBeDefined();
  // Base x/y unchanged: the drag adjusted the slide rule, not the origin.
  expect(after!.x).toBe(before.x);
  expect(after!.y).toBe(before.y);
  // slidePx default is 30; drag delta should add to it.
  expect(after!.props?.slidePx).toBeGreaterThan(30);
  // slideDy default is 0; negative drag should drive it negative.
  expect(after!.props?.slideDy).toBeLessThan(0);

  // Save dispatched with the new props.
  await expect.poll(async () =>
    await page.evaluate(() => {
      const sent = window.__wirefold_test.getSent();
      return sent.some((m) => {
        const msg = m as { type?: string; text?: string };
        if (msg.type !== "save" || !msg.text) return false;
        try {
          const s = JSON.parse(msg.text) as Spec;
          const p0 = s.nodes.find((n) => n.id === "p0");
          return !!p0?.props && typeof p0.props.slidePx === "number" && p0.props.slidePx !== 30;
        } catch { return false; }
      });
    }),
  ).toBe(true);
});
