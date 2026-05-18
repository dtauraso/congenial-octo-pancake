// Scenario: the full 5-node ring topology flows end-to-end.
// Observable: Input fires, then ReadGate fires (signal traverses ring).
// Both are observable via the [wirefold] trace.* console channel.
// The ring needs the feedback edge seed (i1.out->readGate.chainIn2,
// seed:1) to break the startup deadlock.

import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const HERE = __dirname;
const HARNESS_URL = pathToFileURL(resolve(HERE, "harness.html")).toString();

declare global {
  interface Window {
    __wirefold_fixture: string;
    __wirefold_test?: unknown;
  }
}

test("ring: full 5-node topology — Input fires and ReadGate passes through", async ({ page }) => {
  const fixture = readFileSync(resolve(HERE, "fixtures/ring-5node.json"), "utf-8");
  const logs: string[] = [];
  page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => logs.push(`[pageerror] ${err.message}`));

  await page.addInitScript((text: string) => { window.__wirefold_fixture = text; }, fixture);
  await page.goto(HARNESS_URL);

  // Wait for the app to mount.
  await page.waitForSelector(".react-flow__node");

  // Input node must fire within a few animation frames.
  await expect.poll(
    () => logs.some((l) => l.includes("trace.input.fire")),
    { timeout: 4000, message: () => `Input never fired; logs:\n${logs.join("\n")}` },
  ).toBe(true);

  // ReadGate must fire — meaning the seeded feedback value enabled the gate
  // and the ring is circulating.
  await expect.poll(
    () => logs.some((l) => l.includes("trace.readgate.fire")),
    { timeout: 8000, message: () => `ReadGate never fired; logs:\n${logs.join("\n")}` },
  ).toBe(true);
});
