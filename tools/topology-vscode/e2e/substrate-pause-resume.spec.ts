// Integration regression: pause + resume during an in-flight pulse
// must not inject a duplicate token into the emit stream. The bug
// surfaced as "11" or "00" combinations in the user-visible value
// sequence after toggling the toolbar pause/play button.
//
// Mechanism: emitNext is gated on an `awaitingAck` flag set on emit
// and cleared on pulse-ack. resumeSubstrate must NOT call emitNext
// while awaitingAck is true — the in-flight pulse's ack will trigger
// the next emission naturally.

import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const HERE = __dirname;
const HARNESS_URL = pathToFileURL(resolve(HERE, "harness.html")).toString();

test("substrate: pause+resume during in-flight pulse does not duplicate", async ({ page }) => {
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

  // Wait for the first emit to be in flight.
  await expect.poll(
    () => logs.filter((l) => l.includes("[substrate] emit")).length,
    { timeout: 4000, message: () => `no emit logs; saw:\n${logs.join("\n")}` },
  ).toBeGreaterThanOrEqual(1);

  const emitsBefore = logs.filter((l) => l.includes("[substrate] emit")).length;

  // Pause and immediately resume while the first pulse is mid-arc.
  // No new emit should fire from the resume itself; the next emit must
  // wait for the in-flight pulse's ack.
  await page.evaluate(() => {
    const t = window.__wirefold_test as { pauseSubstrate: () => void; resumeSubstrate: () => void };
    t.pauseSubstrate();
    t.resumeSubstrate();
  });

  // Settle: the resume must not have produced an immediate extra emit.
  // A duplicate would show up as a second emit log within ~10ms.
  await page.waitForTimeout(50);
  const emitsAfterResume = logs.filter((l) => l.includes("[substrate] emit")).length;
  expect(
    emitsAfterResume,
    `resume injected ${emitsAfterResume - emitsBefore} extra emit(s); logs:\n${logs.join("\n")}`,
  ).toBe(emitsBefore);

  // Sanity: the ack-driven loop still works after pause/resume — the
  // next emit arrives once the in-flight pulse traverses (~1.5s).
  await expect.poll(
    () => logs.filter((l) => l.includes("[substrate] emit")).length,
    { timeout: 5000, message: () => `loop stalled; saw:\n${logs.join("\n")}` },
  ).toBeGreaterThan(emitsBefore);
});

declare global {
  interface Window {
    __wirefold_fixture: string;
    __wirefold_test?: unknown;
  }
}
