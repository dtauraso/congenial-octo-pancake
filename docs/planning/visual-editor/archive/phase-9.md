# Phase 9 — diagram parity with the reference SVGs

> **Status:** historical — paths may be stale post-reorg. See [handoff.md](handoff.md) for current state.

**Cap:** ~1.5 + ~½ visual baselines = ~2. **$ extra-usage est:** ~$18 midpoint (range $10–$32, 1.5× UI-iteration heavy). **Actual: $4.93** ✅ across 4 chunks: edge route dispatch + adapter propagation `6a2316e` ($0.56), house-style edge vocabulary + legend `bc1ff39` ($1.35), notes round-trip + node sub-rows `edd80b8` ($1.38), Tier 4 visual regression baselines `f0477c8` ($1.64). The previously-failing `it.fails` round-trip contract for the full-fields fixture (route/lane/valueLabel/arrowStyle/notes) flipped to a real `it` in chunk 3 — the adapter no longer drops spec fields.

Bring the editor's rendering up to the visual fidelity of `diagrams/topology-chain-cascade.svg` and the rest of the hand-authored set, so the editor and the documentation diagrams agree at a glance. The spec already carries the inputs (`edge.route: line | snake | below`, `edge.lane`, `arrowStyle`, `legend`, `notes`, named ports); the current adapter ignores most of them.

**Scope:** custom RF edge components per `route` kind (orthogonal snake-paths, under/above lanes for `feedback-ack` / `inhibit-in`); per-port `Handle` rendering on nodes (also unblocks Phase 3's port-drag gesture); the house style from [docs/svg-style-guide.md](../../svg-style-guide.md) (dashed strokes by kind, marker-end variants, value labels along edges, legend block); custom node bodies for shapes the SVG distinguishes (pill vs rect, internal sub-rows); render `spec.notes[]` as floating annotation boxes in the canvas (the cascade SVG's `behavior-note-*` blocks — spec already carries them, adapter currently drops them).

**Excluded:** choreography beyond `fires` / `departs` / `arrives` (would require extending the spec — out of scope for parity); top-level diagram title / framing background (no spec field today; defer until a `title` field is needed).

- **[~½]** ✅ Tier 4 visual regression: screenshot diffs at fixed cameras, one per `route` kind, via Playwright's `toHaveScreenshot`. Tolerance set in `playwright.config.ts` (`maxDiffPixelRatio: 0.01`, `animations: "disabled"`); baselines pinned under `e2e/visual-regression.spec.ts-snapshots/`. CI image pinning (e.g. `mcr.microsoft.com/playwright:v1.59.1-jammy`) is the durable flake fix and lives in CI config.