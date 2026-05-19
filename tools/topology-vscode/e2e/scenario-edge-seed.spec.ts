// Scenario: a wire with data.seed fills the destination slot at mount.
// Observable: the [wirefold] trace.seed log appears with the correct
// wire id and value, and the seed does NOT require any user action.
// Fixture: ring-5node — edges i1.out->readGate.ack and
// i1.inhibitOut->inhibitRight0.right both carry seed:1.

import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const HERE = __dirname;
const HARNESS_URL = pathToFileURL(resolve(HERE, "harness.html")).toString();

declare global {
  interface Window {
    __wirefold_fixture: string;
  }
}

test("edge-seed: wires with seed:1 log trace.seed at mount", async ({ page }) => {
  const fixture = readFileSync(resolve(HERE, "fixtures/ring-5node.json"), "utf-8");
  const logs: string[] = [];
  page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => logs.push(`[pageerror] ${err.message}`));

  await page.addInitScript((text: string) => { window.__wirefold_fixture = text; }, fixture);
  await page.goto(HARNESS_URL);

  await page.waitForSelector(".react-flow__node");

  // Both seeded edges must log trace.seed shortly after mount.
  await expect.poll(
    () => logs.some((l) =>
      l.includes("trace.seed") && l.includes("i1.out->readGate.ack")),
    { timeout: 3000, message: () => `seed log absent for i1->readGate; logs:\n${logs.join("\n")}` },
  ).toBe(true);

  await expect.poll(
    () => logs.some((l) =>
      l.includes("trace.seed") && l.includes("i1.inhibitOut->inhibitRight0.right")),
    { timeout: 3000, message: () => `seed log absent for inhibit edge; logs:\n${logs.join("\n")}` },
  ).toBe(true);
});
