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
  `e06447b` (delete dead bookmarks + fold-halo stub, -78 lines).
  Pushed. Not yet merged. Posture remains structural rewrite — David
  signed off on continuing the deletion sweep beyond the substrate
  cutover. The session landed four commits, all deletion or
  React-native replacement work:

  1. `38d2a9f` delete the old slog/substrate-log logging system
     (7 files, -134 lines).
  2. `23eb90e` new logging system: `<ErrorBoundary>` +
     `<CrashListeners>` + `postLog` transport + extension-side
     `appendWebviewLog` writing `.probe/webview-log.jsonl`
     (+153 lines, 4 new files under `src/webview/log/`).
  3. `3da0928` delete dead probe-dump and trace message channels
     (-116 lines; 11 message types removed, `probe-dumps.ts` and
     `trace-pick.ts` deleted).
  4. `e06447b` delete dead bookmarks system and fold-halo stub
     (-78 lines; `bookmarks-store.ts`, `Bookmark` type and parser,
     `useFoldHaloState` stub and `FOLD_HALO_BOX_SHADOW`).

  Net for the session: substrate has no logging code at all; the new
  React-resident logging lives at `src/webview/log/` (post.ts,
  ErrorBoundary.tsx, CrashListeners.tsx). Eleven dead message types
  retired and two stubs (bookmarks, fold-halo) deleted.

  **Two specs landed**, both on main:
  - [manual-take-model.md](manual-take-model.md) — destination-policy
    model; take is the single permitted observer→substrate signal.
  - [react-surface-spec.md](react-surface-spec.md) — substrate
    primitives as React components: `<Wire>` owns phase, `<Node>`
    owns run and manual-take, `useTickDriver` walks rounds.

  **Gates:** tsc ✓, build ✓, vitest 132/132 ✓, vocab ✓, LOC ✓.
  (Test count dropped 133 → 132 with the bookmarks parser test
  removal in `e06447b`.)

  **Open dead-export candidates** (surfaced via ts-prune, not yet
  acted on):
  - `src/webview/geom.ts` — entire file (83 LOC) has no importers.
  - `save.ts:postReady`, `save.ts:isSynced`, `save.ts:markSynced`
    plus the `lastSyncedText` module state they share — vestigial
    pre-zustand sync tracking.
  - `MarkerDefs.tsx:markerEndUrl` — helper export with no callers
    (the `MarkerDefs` component is alive).
  - `substrate-r/TopologyRoot.tsx` — flagged as "spec-driven
    orchestrator" in the cutover commit but only used by
    `test/contracts/r-topology-smoke.test.tsx`. Live editor wires
    `RSubstrateNode` / `RSubstrateEdge` directly under React Flow.
    Judgment call before deleting: is the smoke test exercising
    valuable substrate-primitives behavior under a different name,
    or is it scaffolding from the spike?

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place.

## Next move

  Read [handoff-next-task.md](handoff-next-task.md). The
  merge-blocking item is edge visual fidelity. Dead-export sweep
  candidates above are well-scoped follow-ups if the user wants to
  keep stripping before tackling visuals.

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
