# Phase 9 — diagram parity with the reference SVGs

**[~1.5 + ~½ visual baselines = ~2]** ⏳ Bring the editor's rendering up to the visual fidelity of `diagrams/topology-chain-cascade.svg` and the rest of the hand-authored set, so the editor and the documentation diagrams agree at a glance. The spec already carries the inputs (`edge.route: line | snake | below`, `edge.lane`, `arrowStyle`, `legend`, `notes`, named ports); the current adapter ignores most of them.

**Scope:** custom RF edge components per `route` kind (orthogonal snake-paths, under/above lanes for `feedback-ack` / `inhibit-in`); per-port `Handle` rendering on nodes (also unblocks Phase 3's port-drag gesture); the house style from [docs/svg-style-guide.md](../../svg-style-guide.md) (dashed strokes by kind, marker-end variants, value labels along edges, legend block); custom node bodies for shapes the SVG distinguishes (pill vs rect, internal sub-rows); render `spec.notes[]` as floating annotation boxes in the canvas (the cascade SVG's `behavior-note-*` blocks — spec already carries them, adapter currently drops them).

**Excluded:** choreography beyond `fires` / `departs` / `arrives` (would require extending the spec — out of scope for parity); top-level diagram title / framing background (no spec field today; defer until a `title` field is needed).

- **[~½]** ⏳ Tier 4 visual regression: screenshot diffs at fixed cameras, one per `route` kind. Tolerance thresholds + pinned CI image to control flake (font rendering, anti-aliasing). Turns "matches the reference SVGs" from a per-change judgment call into pass/fail.
