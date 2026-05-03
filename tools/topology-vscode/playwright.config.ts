import { defineConfig, devices } from "@playwright/test";

// Tier 3 gesture tests. Vitest stays the default `npm test`; Playwright is
// opt-in via `npm run test:e2e` until the gesture set stabilizes (see
// docs/planning/visual-editor-plan.md, Phase 3). Browsers must be
// installed once: `npx playwright install chromium`.
export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    viewport: { width: 1280, height: 800 },
    actionTimeout: 5000,
  },
  // Tier 4 visual regression tolerance. Anti-aliasing and font rendering
  // produce a few-pixel jitter even on the same machine; the threshold
  // catches real layout regressions while absorbing that noise. The
  // pinned-CI-image part of the brief is a harness concern (Playwright's
  // own Docker tag, e.g. mcr.microsoft.com/playwright:v1.59.1-jammy) —
  // see e2e/README.md.
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
