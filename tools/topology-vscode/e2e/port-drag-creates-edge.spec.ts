import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const HERE = __dirname;
const HARNESS_URL = pathToFileURL(resolve(HERE, "harness.html")).toString();

type SentMsg = { type: string; text?: string };
type Spec = {
  nodes: { id: string; type: string }[];
  edges: {
    id: string;
    source: string;
    sourceHandle: string;
    target: string;
    targetHandle: string;
    kind: string;
    label?: string;
  }[];
};

declare global {
  interface Window {
    __wirefold_fixture: string;
    __wirefold_sent: SentMsg[];
    __wirefold_test: {
      getSpec: () => Spec;
      getSent: () => SentMsg[];
    };
  }
}

function loadFixture(name: string): string {
  return readFileSync(resolve(HERE, "fixtures", name), "utf-8");
}

test.describe("Tier 3 gestures", () => {
  test("port drag creates an edge with inferred kind and a save is posted", async ({ page }) => {
    const fixture = loadFixture("two-node.json");
    await page.addInitScript((text: string) => {
      window.__wirefold_fixture = text;
    }, fixture);

    await page.goto(HARNESS_URL);

    // Wait for the webview to mount the two nodes.
    await page.waitForSelector('.react-flow__node[data-id="in0"]');
    await page.waitForSelector('.react-flow__node[data-id="i0"]');

    // React Flow tags handles with data-nodeid + data-handleid.
    const sourceHandle = page.locator(
      '.react-flow__handle[data-nodeid="in0"][data-handleid="out"]',
    );
    const targetHandle = page.locator(
      '.react-flow__handle[data-nodeid="i0"][data-handleid="in"]',
    );
    await expect(sourceHandle).toBeVisible();
    await expect(targetHandle).toBeVisible();

    const src = await sourceHandle.boundingBox();
    const dst = await targetHandle.boundingBox();
    if (!src || !dst) throw new Error("handle bounding box missing");

    const sx = src.x + src.width / 2;
    const sy = src.y + src.height / 2;
    const tx = dst.x + dst.width / 2;
    const ty = dst.y + dst.height / 2;

    // RF connection lifecycle: pointerdown on the source handle, drag a few
    // intermediate points so its connection-line tracks the move, release on
    // the target. Two intermediate moves are enough; a single move sometimes
    // fires before RF binds the document-level pointermove listener.
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move((sx + tx) / 2, (sy + ty) / 2, { steps: 5 });
    await page.mouse.move(tx, ty, { steps: 5 });
    await page.mouse.up();

    // Spec mutation is observable on the test hook. Wait until the new edge
    // shows up rather than racing on a fixed delay.
    await expect.poll(async () =>
      await page.evaluate(() => window.__wirefold_test.getSpec().edges.length),
    ).toBe(1);

    const spec = await page.evaluate(() => window.__wirefold_test.getSpec());
    expect(spec.edges).toHaveLength(1);
    const e = spec.edges[0];
    expect(e.source).toBe("in0");
    expect(e.sourceHandle).toBe("out");
    expect(e.target).toBe("i0");
    expect(e.targetHandle).toBe("in");
    // Both ports are kind "chain" in NODE_TYPES, so onConnect infers chain
    // (no fallback to "any"). Tightens the assertion vs. a generic match.
    expect(e.kind).toBe("chain");
    expect(e.label).toMatch(/^[A-Za-z_][A-Za-z0-9_]*$/);

    // The webview's debounced save (250ms) eventually posts the new spec to
    // the host. Poll for it; the saved JSON must contain the new edge.
    await expect.poll(async () =>
      await page.evaluate(() =>
        window.__wirefold_test.getSent().some(
          (m) => m.type === "save" && (m.text ?? "").includes('"in0"') &&
            (m.text ?? "").includes('"sourceHandle": "out"'),
        ),
      ),
    ).toBe(true);
  });

  // TODO: Tier 3 — delete-selection removes node + incident edges + timing.fires[id].
  // TODO: Tier 3 — palette-drag at coords persists position across reload.
  // TODO: Tier 3 — rename to clashing id rejects with inline error.
  // TODO: Tier 3 — port-drag with mismatched kinds falls back to "any".
});
