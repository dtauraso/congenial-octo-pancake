import { defineConfig, devices } from "@playwright/test";

// Tier 4 latency is gated behind an env var so a bare
// `npx playwright test` runs only the fast Tier 3 suite. The
// `npm run test:tier4` script sets the var; CI nightly should
// do the same. Without this gate, Playwright would run every
// configured project by default and the slow `go build` test
// would creep into per-commit runs.
const TIER4 = !!process.env.PLAYWRIGHT_TIER4;

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
    {
      name: "chromium",
      testIgnore: /e2e\/tier4\//,
      use: { ...devices["Desktop Chrome"] },
    },
    // Tier 4 nightly latency. Opt-in via `npm run test:tier4` because it
    // shells out to `go run` + `go build` and is slower than the gesture
    // suite. Skips cleanly when `go` is missing.
    ...(TIER4
      ? [{
          name: "tier4-latency",
          testDir: "./e2e/tier4",
          timeout: 60_000,
          use: { ...devices["Desktop Chrome"] },
        }]
      : []),
  ],
});
