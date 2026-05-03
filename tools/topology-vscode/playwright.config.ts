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
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
