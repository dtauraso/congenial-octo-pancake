// Tier 4 nightly headline: success criterion #1 ("under 30 seconds
// end-to-end") made executable. Drives a node-drag gesture in the
// webview harness, captures the resulting saved spec, then invokes
// the same code path the editor uses (`go run ./cmd/topogen`) and
// `go build`s the regenerated Wiring package. Asserts hard fail at
// 30s; warns at >10s so latency drift surfaces before the cliff.
//
// Lives in its own Playwright project (`tier4-latency`) so the
// default `npm run test:e2e` stays fast and Go-toolchain-free.
// Skips cleanly when `go` is missing.
//
// The output Wiring/wiring.go is written to a tempdir under
// e2e/tier4/.tmp/ rather than the repo's real Wiring/ — leaves
// pre-existing modifications alone per the brief. The tmp path is
// inside the Go module so package imports resolve.

import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve, join } from "node:path";

const HERE = __dirname;
const REPO_ROOT = resolve(HERE, "../../../..");
const HARNESS_URL = pathToFileURL(resolve(HERE, "../harness.html")).toString();
const TMP_PARENT = resolve(HERE, ".tmp");

const HARD_FAIL_MS = 30_000;
const SOFT_WARN_MS = 10_000;

type Spec = { nodes: { id: string; x: number; y: number }[] };

declare global {
  interface Window {
    __wirefold_fixture: string;
    __wirefold_test: { getSpec: () => Spec; getSent: () => unknown[] };
  }
}

function goAvailable(): boolean {
  try {
    const r = spawnSync("go", ["version"], { encoding: "utf-8" });
    return r.status === 0;
  } catch {
    return false;
  }
}

test("edit → topogen → go build completes under 30s end-to-end", async ({ page }) => {
  test.skip(!goAvailable(), "go not on PATH — Tier 4 latency requires a Go toolchain");

  // Load the canonical fixture (known to topogen-format cleanly).
  const fixture = readFileSync(resolve(HERE, "fixtures/baseline-topology.json"), "utf-8");
  await page.addInitScript((text: string) => { window.__wirefold_fixture = text; }, fixture);
  await page.goto(HARNESS_URL);
  await page.waitForSelector('.react-flow__node[data-id="i0Test3"]');

  const before = await page.evaluate(() =>
    window.__wirefold_test.getSpec().nodes.find((n) => n.id === "i0Test3"));
  if (!before) throw new Error("i0Test3 not in spec");

  const node = page.locator('.react-flow__node[data-id="i0Test3"]');
  const box = await node.boundingBox();
  if (!box) throw new Error("node bbox missing");
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  // Start the clock at the gesture, end it after `go build` returns.
  // This is the headline "edit-to-running-Go" interval.
  const t0 = Date.now();

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 60, startY - 30, { steps: 5 });
  await page.mouse.move(startX + 120, startY - 60, { steps: 5 });
  await page.mouse.up();

  // Wait for the debounced save with the new coords.
  const savedText = await page.evaluate(async (origX) => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const sent = window.__wirefold_test.getSent();
      for (const m of sent) {
        const msg = m as { type?: string; text?: string };
        if (msg.type !== "save" || !msg.text) continue;
        try {
          const s = JSON.parse(msg.text) as Spec;
          const i0 = s.nodes.find((n) => n.id === "i0Test3");
          if (i0 && i0.x !== origX) return msg.text;
        } catch { /* ignore */ }
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    return null;
  }, before.x);

  expect(savedText, "webview must post a save with the dragged coords").not.toBeNull();

  // Set up an isolated output package so the repo's real Wiring/wiring.go
  // is not touched. The tmpdir lives inside the Go module tree so import
  // paths resolve during `go build`.
  mkdirSync(TMP_PARENT, { recursive: true });
  const tmpdir = mkdtempSync(join(TMP_PARENT, "run-"));
  try {
    const wiringDir = join(tmpdir, "Wiring");
    mkdirSync(wiringDir, { recursive: true });
    const specPath = join(tmpdir, "topology.json");
    const outPath = join(wiringDir, "wiring.go");
    writeFileSync(specPath, savedText!, "utf-8");

    // Same code path the editor's TopogenRunner.write() uses.
    const gen = spawnSync(
      "go",
      ["run", "./cmd/topogen", "-in", specPath, "-out", outPath],
      { cwd: REPO_ROOT, encoding: "utf-8" },
    );
    expect(gen.status, `topogen failed: ${gen.stderr}`).toBe(0);

    const build = spawnSync("go", ["build", wiringDir], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    });
    expect(build.status, `go build failed: ${build.stderr}`).toBe(0);

    const elapsed = Date.now() - t0;
    // eslint-disable-next-line no-console
    console.log(`[tier4-latency] edit→go-build elapsed: ${elapsed}ms (warn>${SOFT_WARN_MS}, fail>${HARD_FAIL_MS})`);
    if (elapsed > SOFT_WARN_MS) {
      // eslint-disable-next-line no-console
      console.warn(`[tier4-latency] WARN: ${elapsed}ms exceeds soft budget ${SOFT_WARN_MS}ms — drift before the 30s cliff`);
    }
    expect(elapsed).toBeLessThan(HARD_FAIL_MS);
  } finally {
    rmSync(tmpdir, { recursive: true, force: true });
  }
});
