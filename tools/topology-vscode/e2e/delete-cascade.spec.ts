// Tier 3 gesture: delete-selection removes node + incident edges +
// timing.fires reference. Complement to test/delete.test.ts (which covers
// the applyDelete contract at unit level) — this asserts the gesture path
// from key press to spec mutation works in the live webview.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const HERE = __dirname;
const HARNESS_URL = pathToFileURL(resolve(HERE, "harness.html")).toString();

type Spec = {
  nodes: { id: string }[];
  edges: { id: string; source: string; target: string }[];
  timing?: {
    steps?: { fires?: string[]; departs?: string[]; arrives?: string[] }[];
  };
};

declare global {
  interface Window {
    __wirefold_fixture: string;
    __wirefold_view_fixture?: string;
    __wirefold_test: { getSpec: () => Spec };
  }
}

test.describe("Tier 3 gestures", () => {
  test("delete-selection cascades incident edges and scrubs timing.fires", async ({ page }) => {
    const fixture = readFileSync(
      resolve(HERE, "fixtures", "three-node-with-edges.json"),
      "utf-8",
    );
    const viewFixture = JSON.stringify({ lastSelectionIds: ["i0"] });
    await page.addInitScript(
      ({ spec, view }: { spec: string; view: string }) => {
        window.__wirefold_fixture = spec;
        window.__wirefold_view_fixture = view;
      },
      { spec: fixture, view: viewFixture },
    );
    await page.goto(HARNESS_URL);

    await page.waitForSelector('.react-flow__node[data-id="i0"].selected');

    await page.keyboard.press("Delete");

    // The node and both incident edges (e_in0_i0, e_i0_i1) should be gone.
    await expect.poll(async () =>
      await page.evaluate(() => window.__wirefold_test.getSpec().nodes.length),
    ).toBe(2);

    const spec = await page.evaluate(() => window.__wirefold_test.getSpec());
    expect(spec.nodes.map((n) => n.id).sort()).toEqual(["i1", "in0"]);
    expect(spec.edges).toEqual([]);
    // timing.fires must have been scrubbed of the deleted node id; the
    // remaining "in0" entry stays.
    const fires = spec.timing?.steps?.[0]?.fires ?? [];
    expect(fires).toEqual(["in0"]);
    // departs/arrives referenced the cascaded edge — both should be empty.
    expect(spec.timing?.steps?.[0]?.departs ?? []).toEqual([]);
    expect(spec.timing?.steps?.[0]?.arrives ?? []).toEqual([]);
  });
});
