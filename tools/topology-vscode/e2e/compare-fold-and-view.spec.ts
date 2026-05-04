// Tier 3 system-shape (Phase 5):
//   1. fold + diff — when a folded region is expanded, member nodes that
//      differ between live and comparison still carry their diff classes.
//      Documents the rule: fold state and diff state compose; neither
//      swallows the other. (Downgraded scope: the *collapsed* placeholder
//      badge with category counts is a future enhancement; the expanded
//      case alone proves composition.)
//   2. saved-view + diff — a node can be both .dim (saved view active) and
//      .diff-moved at the same time without one className clobbering the
//      other. Pinned at the className-composition level; the visual punch-
//      through ("halo at full opacity even when body is dimmed") needs a
//      CSS refactor to move dim's opacity off the wrapper, tracked
//      separately from this test.

import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const HERE = __dirname;
const HARNESS_URL = pathToFileURL(resolve(HERE, "harness.html")).toString();

declare global {
  interface Window {
    __wirefold_fixture: string;
    __wirefold_view_fixture?: string;
    __wirefold_test: { applyDim: (members: string[] | undefined) => void };
  }
}

const live = () => readFileSync(resolve(HERE, "fixtures", "compare-live.json"), "utf-8");
const other = () => readFileSync(resolve(HERE, "fixtures", "compare-other.json"), "utf-8");

async function loadCompareLive(page: import("@playwright/test").Page, view?: object) {
  const liveText = live();
  const viewText = view ? JSON.stringify(view) : undefined;
  await page.addInitScript(
    ({ s, v }: { s: string; v?: string }) => {
      window.__wirefold_fixture = s;
      if (v) window.__wirefold_view_fixture = v;
    },
    { s: liveText, v: viewText },
  );
  await page.goto(HARNESS_URL);
  await page.waitForSelector('.react-flow__node[data-id="a"]');
  await page.waitForSelector('.react-flow__node[data-id="b"]');
  await page.evaluate((text: string) => {
    window.postMessage(
      { type: "compare-load", source: "file", text, label: "fixtures/compare-other.json" },
      "*",
    );
  }, other());
}

test.describe("Phase 5 — system-shape composition", () => {
  test("fold + diff: expanded fold members keep their diff classes", async ({ page }) => {
    // Pre-set viewerState with an *expanded* fold containing the moved
    // member "b". Expanded folds render members; the diff decoration must
    // still attach .diff-moved to b regardless of the fold wrapper.
    await loadCompareLive(page, {
      folds: [
        {
          id: "fold-test",
          label: "test fold",
          memberIds: ["b"],
          position: [300, 100],
          collapsed: false,
        },
      ],
    });

    // Wait for diff decoration to settle (fold render + decorate pass).
    await expect.poll(async () =>
      page.locator('.react-flow__node[data-id="b"].diff-moved').count(),
    ).toBeGreaterThan(0);

    // Sanity: the fold frame is also rendered (so we know we're in the
    // expanded-with-members state, not a fallback).
    await expect(page.locator(".fold-frame")).toHaveCount(1);
  });

  test("saved-view + diff: a node carries both .dim and a diff class", async ({ page }) => {
    await loadCompareLive(page);
    // After compare-load lands, dim everything not in the {a} subset; b
    // therefore gets .dim AND .diff-moved (b moved between live and other).
    // Wait for diff to land first so .diff-moved is present when we assert.
    await expect.poll(async () =>
      page.locator('.react-flow__node[data-id="b"].diff-moved').count(),
    ).toBeGreaterThan(0);
    await page.evaluate(() => {
      window.__wirefold_test.applyDim(["a"]);
    });

    const both = page.locator('.react-flow__node[data-id="b"].dim.diff-moved');
    await expect(both).toHaveCount(1);

    // The wrapper still renders box-shadow (the halo declaration is
    // unconditional); pinning that the rule didn't get clobbered by the
    // dim composition is the load-bearing assertion here.
    const boxShadow = await both.evaluate((el) => getComputedStyle(el).boxShadow);
    // The .diff-moved rule uses outline (not box-shadow); the assertion is
    // really "outline is set." Keep both checks: at least one of outline
    // or box-shadow must be a non-`none` value, otherwise the diff styling
    // got overridden.
    const outline = await both.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(`${boxShadow}|${outline}`).not.toBe("none|none");
    expect(outline).toBe("dashed");
  });
});
