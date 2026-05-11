# Next task: finish the collapse-to-one-layer rewrite

**Branch:** `task/collapse-to-one-layer`. Latest commit `e06447b`
(delete dead bookmarks system + fold-halo stub, -78 lines). Pushed.
Not yet mergeable; remaining items below.

## State at handoff (2026-05-11, session end)

The substrate rewrite is in. Logging has been re-shaped to fit the
new model: `<ErrorBoundary>` + `<CrashListeners>` + `postLog`
transport at `src/webview/log/`, with the extension-side appender
writing `.probe/webview-log.jsonl`. The old `slog`/substrate-log
side-channel is gone. Dead message channels (probe-dumps, trace) and
dead stubs (bookmarks, fold-halo) have all been deleted.

Gates green: tsc ✓, build ✓, vitest 132/132 ✓, vocab ✓, LOC ✓.

## Owed before merge

1. **Edge visual fidelity.** `RSubstrateEdge` draws a plain gray
   line. Lost vs `AnimatedEdge`: kind colors, dash patterns, route
   variants (line/snake/below), arrow markers, edge labels. Port
   from git history at `87822c1^` — the deleted
   `webview/rf/AnimatedEdge/_geom-build.ts`, `_pulse-label.ts`,
   `_edge-labels.tsx`, and `_constants.ts` hold the pieces.

2. **Other node types' substrate behavior.** Today only Input and
   ReadGate have `node-kinds.tsx` entries. ChainInhibitor, AndGate,
   Partition, EdgeNode, etc. mount with no `<Node>` body — fine for
   the user's current working topology but anything that uses them
   will be inert. Friction-driven posture: port each type only
   when it surfaces in a real session.

## Optional follow-up sweeps (orthogonal to merge blockers)

3. **Dead-export sweep, round 2.** ts-prune surfaced:
   - `src/webview/geom.ts` — entire file (83 LOC) has zero importers.
   - `save.ts` — `postReady`, `isSynced`, `markSynced`, and shared
     `lastSyncedText` state, all unused.
   - `MarkerDefs.tsx:markerEndUrl` — helper export with no callers.
   - `substrate-r/TopologyRoot.tsx` — only `r-topology-smoke.test.tsx`
     uses it. Live editor mounts substrate via RSubstrateNode /
     RSubstrateEdge under React Flow, not through TopologyRoot.
     Decide whether the smoke test is exercising valuable
     primitives behavior under a misnamed harness, or whether it's
     spike scaffolding to delete.

## Post-merge

4. **Promote specs into MODEL.md.** Fold `manual-take-model.md` and
   `react-surface-spec.md` content into `MODEL.md`. Delete the
   planning docs.
5. **CLAUDE.md posture note.** Substrate rule was overridden for
   this rewrite. Default posture returns to friction-driven.

## ALWAYS clause

(See handoff.md — same clause applies.)
