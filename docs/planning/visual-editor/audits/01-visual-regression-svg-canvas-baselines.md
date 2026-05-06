### 1. Visual regression — SVG / canvas baselines

**What it checks.** Diagrams and editor canvas renders match stored
baselines. Surfaces unintended visual changes (a CSS tweak that
shifted a node, an edge router change that re-routed an unrelated
edge).

**Backed by.** Phase 9 Tier 4 baselines under
`tools/topology-vscode/test/` and the SVG diagrams under
`diagrams/`.

**Passing.** Playwright / vitest visual checks green; any baseline
diff is intentional and re-blessed.

**Cadence.** Per-PR (CI). Weekly review of accumulated re-blessed
baselines makes sense if drift starts piling up.

**Cost.** CI compute only; model review only when CI red.
