# Risk and effort

Effort is measured in **Opus 4.7 cap hits** — how many times the session token budget is exhausted before the work is done. A "session" here means "one cap exhaustion." Calibration anchor: Phase 2 shipped in ≤2 cap hits.

**Secondary metric: extra-usage dollars.** This project runs on a Pro plan with extra-usage spillover enabled — once the Pro cap is hit, work continues at metered API rates against a budget. Tracking the $ spent past cap on each phase gives a second-axis estimate ("this would cost $X to push through without waiting for the next cap window") and a hard signal because the spillover comes out of a real budget.

**Conversion (cap-hit → API-equivalent $).** Opus 4.7 list rates: $15/M input, $75/M output, $1.50/M cache reads, $18.75/M cache writes. A cap-hit of coding work typically burns ~8–12M cached input reads + ~1–3M fresh input + ~1–3M cache writes + ~200–500k output. **Working midpoint: ~$60 per cap-hit, range $30–$100** depending on workload shape:

| Workload shape | Multiplier | $/cap |
|---|---|---|
| Planning, refactoring, Go-edit-heavy (cache-hit-heavy, few fresh reads) | 0.5–0.75× | $30–45 |
| Mixed coding + verification | 1× | $60 |
| UI iteration with extension reloads, frequent file rereads | 1.25–1.75× | $75–105 |

**How to use it.** Each phase carries a `$ extra-usage` line alongside its cap estimate. The number is `cap × shape-multiplier`, with a range. Record actuals via `/cost` after each phase; a phase whose $-actual diverges sharply from its cap-count is signal that the cap-hit unit isn't capturing the real work shape (and the multiplier table above needs adjusting). Per-phase shape is called out where it deviates from 1×.

What burns the cap: large file reads on each context rebuild, back-and-forth UI iteration with extension reloads, and verification runs through `topogen` that re-read generated Go. Pure planning / small edits are cheap; gesture-by-gesture UI work and keyframe animation work are expensive.

A round of repo cleanup landed before resuming Phase 3 (commits `29413bd…3d5bade`): SVG conventions out of CLAUDE.md auto-load, deleted the parallel `tools/topology-editor/` tree, split `extension.ts` by concern, added `tools/topology-vscode/ARCHITECTURE.md` as a one-screen file map, spec-summary header on generated `Wiring/wiring.go`, and `topogen --check` so debounced saves validate without rewriting the file. The estimates below already credit those savings against the prior `~13` total.

## Per-phase estimates

- **Phase 1:** ~2 cap hits. **Done.** Codegen wiring + sidecar split.
- **Phase 2:** ≤2 cap hits. **Done** (actual). Saved views, bookmarks, build-and-run, master-clock timeline refactor.
- **Phase 3:** ~2.75 cap hits with React Flow migration (~2 migration — ~1.25 substrate + ~¾ tail, slightly over the ~½ tail estimate due to frame-mismatch debugging across the SVG↔RF transition — plus ~¼ Tier 3 harness already landed, plus ~½ for the four queued Tier 3 follow-ups), down from a previous ~3.25 estimate after the Tier 3 harness came in at ~¼ vs. the ~¾ reserve. The standalone-HTML harness option (a) eliminated the vscode-test-electron tail that the original budget reserved for. **Lesson:** when an estimate carries a fork between a cheap path and an expensive fallback, anchor the estimate on the cheap path *if* you can cheaply spike it first; only widen the budget if the cheap path fails. Here the cheap path won outright. Node id rename shipped in ~1 (pre-migration; re-ported during the substrate migration). Port-drag, selection, marquee, and edge-edit collapse to library calls; channel-type inference for codegen stays custom. **Lesson logged for Phases 4 and 6:** when migrating between rendering frames (SVG ↔ RF, keyframe-driven UI), budget extra for things that visually overlay a primitive — they must live in the same DOM frame and transform context as the primitive itself, or alignment / lifecycle / scale drift somewhere.
- **Phase 4.5:** ~3.75 cap hits (audit-driven plugin hardening). Five bands; 4.5.1 (~¾) is data-loss bugs and gates everything else, 4.5.5 (~1) is the test coverage that prevents regression. Sourced from a full code-quality audit of `tools/topology-vscode/`. Worth running before Phase 5 because Phase 5's two-pane mode doubles the surface for every Critical / High item.
- **Phase 4:** ~⅜ cap hit actual (vs. ~1 estimate, vs. ~2 pre-RF). Underran because the slice was three composable pieces (adapter rerouting, FoldNode component, gesture wiring) sharing one surface; folds also turned out to be cheaper as a sibling RF node than as a `parentNode` parent (no relative-coordinate translation, no member-position migration). **Lesson:** when a slice is "library primitive + sidecar bookkeeping + one or two simple gestures" and the spec stays untouched, the budget can compress to ~⅜–½. Apply this to similar-shape future items (Phase 8 snap-to-grid, Phase 8 undo) cautiously; do *not* extrapolate to keyframes (Phase 6) or custom-edge work (Phase 9), which don't share the shape. Nested folds still need manual coordination.
- **Phase 5:** ~1.5 cap hits. Diff is mechanical. Two-pane camera sync + highlight UX is the variable part.
- **Phase 6:** ~2.5 cap hits, risk to ~4. Keyframe interpolation + record-mode editor. The spec-vs-viewer judgment per keyframe kind plus any `topogen` keyframe-reading is what blows it out.
- **Phase 7:** as scoped in [trace-replay-plan.md](../trace-replay-plan.md); several cap hits, dominated by Go-side tracing instrumentation (cheaper per cap hit than UI work — Go edits are token-light).
- **Phase 8:** open-ended; React Flow's built-in undo pattern + snap-to-grid *and* the proven "mutate spec → `specToFlow` rebuild → `setNodes`/`setEdges`" pipeline (used by id rename's `rerender` callback) trim another ~⅛ off the spec-undo line — ~⅜ saved total vs. fully custom. Undo split into three: spec undo (~⅛), deliberate-viewer undo with a separate stack (~⅛), and a visual rollback affordance reusing Phase 5's diff classNames (~⅛). The split costs ~¼ more than the original single-line undo entry but resolves the "does undoing a saved-view delete also undo my last spec edit?" surprise that a single shared stack would create. Worth doing right since the undo stack's shape is structural — painful to retrofit later.

Phases 3–6 remaining (excluding Phase 4.5): **~5.25 cap hits** (Phase 3 ~½ + Phase 5 ~1.5 + Phase 6 ~2.5, +0.5 for sublabel/undo savings already booked, −¾ from the Tier 3 harness underrun, −⅝ from the Phase 4 underrun). **+~3.75 for Phase 4.5** brings the band to **~9 cap hits** through Phase 6 inclusive of audit hardening. Phase 4 itself is now done at ~⅜ actual. Headline pipeline through Phase 3: **~½ more cap hits** from where this branch sits (substrate + migration tail done, Tier 3 harness done; remaining is the four Tier 3 follow-up cases). Phases 4 and 8 stay materially cheaper than the pre-RF estimates; Phase 4 came in cheaper still than its post-RF estimate.

## The biggest risks

- **Letting authoring polish creep up the priority list.** Authoring features feel visible; codegen integration and recall affordances carry more weight per hour invested.
- **Spec/viewer split done late.** If viewer fields leak into the spec, pulling them out later is painful (every existing spec file needs migration). Do the split in Phase 1.
- **Codegen falling behind.** If editing the diagram and updating `topogen` ever drift, the tool stops being a design surface and becomes documentation again. Treat `topogen` capability gaps as Phase 1 blockers, not as future work.
