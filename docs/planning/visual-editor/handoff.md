# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — load-bearing
     next task: cut the editor over to the new React-resident substrate.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — earlier decided substrate model (forever-loops). Superseded for
     the visual editor by the React-component substrate; kept as the
     model that the new primitives realize.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-11, end of session):

  **Active task branch:** `task/collapse-to-one-layer`. Latest commit
  `33af8ee` (handoff doc update). Pushed. Not yet merged. Posture
  remains structural rewrite — the deletion sweep is now fully
  drained. This session landed two source-deletion commits plus the
  doc update, on top of the prior session's logging/messaging/state
  cleanup:

  1. `025f9df` delete dead exports sweep round 2 (-443 lines).
     Removed `geom.ts`, `rf/adapter/flow-to-spec.ts`,
     `rf/fold-activity.ts`, `rf/spec-colors.ts`, and the four
     test files that only existed to exercise them. Trimmed
     `postReady`/`isSynced`/`markSynced`/`lastSyncedText` from
     save.ts; `markerEndUrl` from MarkerDefs; `POSITION_EPSILON`
     from diff-core; `flowToSpec` re-export from adapter.ts.
  2. `2ca5e59` delete dead schema types (-30 lines). Removed
     orphan `EdgeRoute` and the Phase-5.5 handler formalism
     block (`Emission`, `HandlerState/Input/Result/Fn`). Kept
     `Port`/`Note`/`NodeSpec`/`SpecSegment`/`SeedEvent`/
     `NodeTypeDef`/`EDGE_KINDS`/`ArrowStyle` — all referenced
     inside `src/schema/`.
  3. `33af8ee` handoff update — recorded that
     `substrate-r/TopologyRoot.tsx` is intentionally kept as the
     harness for `r-topology-smoke.test.tsx`, the only end-to-end
     test of the substrate cycle.

  Net for the session: -473 lines source/test. No code candidates
  remain on the deletion list. Prior-session context (logging
  rewrite, dead message channels, bookmarks/fold-halo stubs, state
  facade collapse) was landed in `38d2a9f`/`23eb90e`/`3da0928`/
  `e06447b`/`83df794` — see git log for detail.

  **Two specs on main:**
  [manual-take-model.md](manual-take-model.md) and
  [react-surface-spec.md](react-surface-spec.md).

  **Gates:** tsc ✓, build ✓, vitest 114/114 ✓, vocab ✓, LOC ✓.
  (Test count: 132 → 114 with the four test-file deletions plus
  one inline `POSITION_EPSILON` assertion removed.)

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place.

## Next move

  Read [handoff-next-task.md](handoff-next-task.md). The
  merge-blocking item is edge visual fidelity on `RSubstrateEdge`
  (kind colors, dashes, route variants, arrow markers, edge labels);
  port from git history at `87822c1^`. Deletion sweep is done.

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the active branch
(main if no task is in flight). Do not rely on chat history; the
next AI may be a fresh model with no transcript. The rendered
handoff must itself contain this same ALWAYS clause so the loop is
self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
