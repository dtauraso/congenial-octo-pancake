# Testing strategy

Test work items are folded into the phases (Phase 3 prerequisites + retros, Phase 6 keyframe round-trip, Phase 8 e2e, Phase 9 visual). This doc holds the cross-cutting strategy that doesn't belong in any single phase.

**The pipeline shape drives the strategy.** `topology.json` in, generated Go out — most regressions to date have been adapter / codegen drift, not UI behavior. So: guard the contracts cheaply and exhaustively (Tier 1, in Phase 3 prerequisites); add bridge unit cases as the bridge grows (Tier 2, retros in Phase 3 + extensions in Phase 6); test gestures only once they stop changing weekly (Tier 3, end of Phase 3); reserve e2e and visual for nightly (Tier 4, Phases 8 + 9).

**Bar for every test:** it must be able to fail for a real bug we can name. Round-trip tests that re-encode the same `JSON.parse` on both sides, golden tests whose `expected/` was written by running the tool itself with no review, or assertions like `expect(result).toBeDefined()` don't count. *If a test would still pass after deleting the production code path it covers, it's not a test.*

**Per-phase system-shape rule.** Each new feature must contribute *one* Tier 3 case that exercises its interaction with an existing feature, not just its standalone behavior. Standalone gesture tests catch the obvious break; the expensive bugs are the multi-mechanism ones (fold + diff, saved-view + camera-sync, keyframe + playback) that no per-feature test would surface. Each system-shape case is a thin wedge driven into the combinatorial M×N space; the space shrinks measurably with each one. Concrete cases listed under each phase. The rule exists because without it, the gap between "looks right" and "is right" widens monotonically as phases stack.

**Promote invariants from notes to tests.** When a phase entry says "X never happens" or "Y must never fire," that's a candidate for a failing test. Plan-doc rules erode across cap hits and AI sessions; tests don't. Each phase should explicitly list which of its invariants are *enforceable* (have a test that fails if the invariant is violated) and which are still notes-to-self. Closing the gap between the two is part of finishing the phase, not optional polish.

## Tier → Phase map and net savings

| Tier | Cost | Saved (Phases 3–6) | Net | Lives in |
|---|---|---|---|---|
| 1 — contract (round-trip + goldens) | ~1 | ~3–4 | **+2–3** | Phase 3 testing foundation |
| 2 — bridge units + invariant promotions | ~¾ (~½ original + ~¼ promotions across Phases 4–8) | ~1.5–2 | **+¾ to +1¼** | Phase 3 retros; per-phase invariant tests |
| 3 — gesture (Playwright) + system-shape | ~1⅛ (harness ~¼ done + 4 standalone cases ~½ + system-shape cases ~⅜ across Phases 4–8) | ~2–3 | **+1 to +1¾** | end of Phase 3 + per-phase additions |
| 4 — e2e + visual | ~1 | ~1.5 | **+½** | Phase 8 (e2e); Phase 9 (visual) |

Total saved across the plan: roughly **3–4.5 cap hits net** against ~8 remaining for Phases 3–6. Beyond the cap-hit count, contracts becoming enforced rather than remembered compounds in ways the table doesn't capture — and the per-phase system-shape cases compound *against* the M×N combinatorial-bug surface that grows monotonically without them.

**Non-goals.** Unit tests on React Flow internals, coverage percentage targets, testing topogen against hand-written Go (goldens only), snapshot tests of arbitrary serialized output (too easy to rubber-stamp on `-update`).
