# Phase 5 — comparison

**Status:** ✅ done. **Actual:** ~\$5.65 (vs. ~\$110 estimate; ~5% / ~18× overestimate). Shipped in 7 steps across commits `74e6abc` (steps 1–3: diff-core + compare loaders + compare toolbar) and `153c74d` (steps 4–7: diff decoration + onion-skin + Tier 2/3 tests).

**Known follow-ups (not blocking):**
1. Collapsed-fold diff badge with category counts. When a folded region's members differ between live and other, the placeholder currently shows no indicator. `decorateForCompare` would need to compute a per-fold member-diff and attach it to the fold node; `FoldNode.tsx` would render the badge. ~\$3.
2. `.dim` + diff halo punch-through. The phase spec calls for halos to render at full opacity even when the body is dimmed, but `.dim` currently puts opacity on the wrapper, which dims the box-shadow halo too. CSS refactor: move dim's opacity off the wrapper and onto the inner body content. ~\$3.

## Open questions resolved

### 1. Source / surfacing of "the other spec." Unified single-canvas view, not split-pane.

Two interaction modes, both layered on the existing live editor (no second RF instance). Loading: a "Compare with HEAD" button (one-click default; host-side handler shells `git show HEAD:<relpath>` and posts the parsed spec back to the webview) and "Compare with file…" (host-side picker). The webview holds the comparison spec in memory; the live spec remains the only thing wired to topogen / save.

- **Mode A — Toggle + persistent diff halos.** Canvas shows one spec at a time; an A/B toggle flips which is rendered. Playback runs on whichever side you're viewing (single timing array, no ambiguity). Items unique to the currently-shown side get a dashed colored halo (e.g. green halo on B-only nodes when viewing B); moved nodes show a faint ghost outline at their other-side position with a thin connector; retimed nodes get a small clock badge in the corner; rewired edges render dashed. Halos use stroke style + opacity, not fills, so playback flashes stay uncontaminated.
- **Mode B — Onion-skin / ghost overlay.** Live spec renders solid; HEAD/other renders as a translucent layer underneath (~25% opacity). Agreement is invisible (ghost hidden under solid); disagreement appears as translucent shapes peeking out (HEAD-only nodes look faded; live-only nodes look crisp with no ghost behind). Playback animates the live layer; the ghost stays static. A held-key (spacebar) momentarily swaps layer ordering to foreground the ghost.

Mode A is the default; Mode B is a toggle in the comparison toolbar (and the spacebar shortcut while in B). Nested folding keeps the on-screen node count small enough that ghost overlay doesn't get crowded; if a future case stresses it, fall back to Mode A only inside that subgraph.

*Rejected:* split-pane two-RF-instances (two cameras to manage, coupling decisions); diff-only skeleton (loses playback context); crossfade slider (animation-tool-y, not how this tool reads); membership ribbons on a union view (would crowd the canvas without nested folding — kept on the table only conditionally).

*Subsumed:* the original "two RF instances vs. one canvas" and "camera sync mode" sub-questions are decided by the unified-view choice — one RF canvas, one camera. Mode B's ghost shapes are injected as additional RF nodes with a `.ghost` className so they ride RF's coordinate transform for free (no hand-rolled SVG overlay).

### 2. Diff representation. Pure module.

New file [tools/topology-vscode/src/webview/diff-core.ts] exporting `diffSpecs(a: Spec, b: Spec) → SpecDiff` with output shape `{ nodes: { added, removed, moved }, edges: { added, removed, rewired } }` (each a `string[]` of ids). The renderer reads the diff and decorates RF nodes/edges via className. Kept *outside* the spec↔flow adapter — diff is a spec↔spec concern, adapter stays purely render. Tier 2 contract test (already in the per-phase test list) covers no-mutation, determinism, and add/remove symmetry under arg swap.

*Rejected:* folding diff into the adapter (mixes two responsibilities, makes the round-trip test harder to keep honest); per-component lazy diff lookup (over-engineered — spec is small, whole-graph diff is microseconds at the 250ms save cadence).

### 3. Visual highlight vocabulary. Four categories; mix channels; compose with `.dim`.

Diff categories get distinct visual treatment, using a mix of channels so no one channel gets overloaded:
- **Halo color** for membership-difference: `.diff-added` = green halo (stroke ring), `.diff-removed` = red halo.
- **Stroke style** for shape/wire change: `.diff-moved` = amber dashed outline (node), `.diff-rewired` = amber dashed edge stroke.

`.diff-retimed` is *dropped*: `timing.steps[]` is on its way out as a stored spec field (see [Phase 5.5](phase-5.5.md) — Animation model rewrite), so a "retimed" category would be defining a diff against a field that won't exist. If a future per-node `props`/config formalism lands, a `.diff-reconfigured` category (gear badge) would slot in to surface those changes; don't pre-bake it.

**Diff staleness during edits:** the diff recomputes alongside the existing 250ms save debounce — same cadence as topogen. Rule: *what's saved is what's diffed*. Highlights lag the edit by ≤ 250ms, well under the threshold where it would feel stale, and mid-rename keystrokes don't trigger flicker. Live pane stays editable while comparison is open (rejected option (d) — cuts off the "edit and see the diff update" workflow that's the whole point).

**Position threshold for `.diff-moved`:** L¹ dead-band, `|Δx| + |Δy| > 1px` in spec coordinates counts as moved. Sub-pixel drift from formatter / hand-edit differences is suppressed; any intentional layout adjustment ≥ 1px still flags. Threshold lives as `POSITION_EPSILON = 1` in `diff-core.ts`. Tier 2 contract test includes a "drift below threshold isn't reported" case.

Halos / dashed strokes all live on the *outside* of the node body, leaving fills free for playback flashes. Composition with the existing `.dim` saved-view class: **diff highlights punch through dim** — the node stays at ~18% body opacity but its halo renders at full opacity, so a change in a non-active view is still glanceable. Tier 3 saved-view+diff test enforces this rule. Final tuning of palette/sizes is left to in-editor iteration once visuals land — taste calls easier to make against real diffs than in the abstract.

## Work items

- **[~½]** Side-by-side mode loading two specs (current vs. git HEAD, or two files).
- **[~½]** Computed diff: added / removed / moved / rewired. (Mechanical. `retimed` dropped — see Phase 5.5.)
- **[~½]** Visual highlight (color tint, badges) for diff items. (Two-pane camera sync UX is the variable part.)
- **[~⅛]** Tier 2 contract test: `diffSpecs(a, b)` is a pure function — no spec mutation, deterministic output, symmetric where appropriate (added vs. removed swap when args swap). Each diff category gets a fixture pair. Locks down the diff before the renderer-side decoration adds noise.
- **[~⅛]** Tier 2 invariant test: only the *live* pane talks to topogen. Spy on `vscode.postMessage`, mutate the comparison pane's nodes, assert no `{type: "save"}` fires from that pane. Catches the bug where the comparison pane accidentally re-runs codegen against a HEAD spec.
- **[~⅛]** Tier 3 system-shape test: fold + diff. Load two specs that differ inside a folded region; verify diff highlighting surfaces on the placeholder when collapsed (badge with category counts) and on the underlying members when expanded. Documents the rule: diff state composes with fold state, neither swallows the other.
- **[~⅛]** Tier 3 system-shape test: saved-view + diff. With a saved view active, the dim/active className must compose with the diff classNames without one overriding the other. Concrete failure shape: `.dim` and `.diff-added` both set on a node — both styles must be visible (e.g., dimmed-but-tinted), or one must explicitly win per a documented rule.
