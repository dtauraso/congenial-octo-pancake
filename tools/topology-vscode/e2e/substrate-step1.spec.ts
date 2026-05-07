// Port-plan step 1 smoke test: loading the 2-node Input -> ReadGate
// topology must route through the rebuild substrate (matchSubstrate
// returns true) and the substrate's setInterval must produce at least
// one EmitEvent within a few seconds.
//
// Probe channel is console.log for now. Step 3's R1 contract test
// replaces this with an event-bus assertion via __wirefold_test.

import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const HERE = __dirname;
const HARNESS_URL = pathToFileURL(resolve(HERE, "harness.html")).toString();

test("substrate: 2-node Input->ReadGate matches and emits", async ({ page }) => {
  const fixture = readFileSync(resolve(HERE, "fixtures/substrate-2node.json"), "utf-8");
  const logs: string[] = [];
  page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => logs.push(`[pageerror] ${err.message}`));

  await page.addInitScript((text: string) => { window.__wirefold_fixture = text; }, fixture);
  await page.goto(HARNESS_URL);

  await page.waitForFunction(
    () => window.__wirefold_test !== undefined,
    null,
    { timeout: 5000 },
  );

  // matchSubstrate must accept the fixture.
  await expect.poll(
    () => logs.some((l) => l.includes("[substrate] match")),
    { timeout: 3000, message: () => `no match log; saw:\n${logs.join("\n")}` },
  ).toBe(true);

  // loadSubstrate must run.
  await expect.poll(
    () => logs.some((l) => l.includes("[substrate] loaded")),
    { timeout: 3000, message: () => `no loaded log; saw:\n${logs.join("\n")}` },
  ).toBe(true);

  // First emit must arrive within EMIT_INTERVAL_MS + slack.
  await expect.poll(
    () => logs.filter((l) => l.includes("[substrate] emit")).length,
    { timeout: 4000, message: () => `no emit logs; saw:\n${logs.join("\n")}` },
  ).toBeGreaterThanOrEqual(1);

  // The emit must reach AnimatedEdge and mount a PulseInstance — that's
  // the actual "visible motion" criterion for step 1. Without this, an
  // emit firing into an empty subscriber set passes silently. The pulse
  // path lives ~1500ms then unmounts, so we look for it within the
  // animation window of an emit.
  await expect.poll(
    async () =>
      await page.locator('path[data-testid="pulse"][data-edge-id="in0.out->readGate.chainIn"]').count(),
    { timeout: 4000, message: () => `no pulse path mounted; saw logs:\n${logs.join("\n")}` },
  ).toBeGreaterThanOrEqual(1);
});

declare global {
  interface Window {
    __wirefold_fixture: string;
    __wirefold_test?: unknown;
  }
}
