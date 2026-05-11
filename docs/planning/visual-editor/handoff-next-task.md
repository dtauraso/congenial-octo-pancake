# Next task: finish the collapse-to-one-layer rewrite

**Branch:** `task/collapse-to-one-layer`. Latest commit `33af8ee`
(handoff doc update). Pushed. Not yet mergeable; remaining items
below.

## State at handoff (2026-05-11, end of session)

The substrate rewrite is in. The deletion sweep is fully drained:
substrate has no logging code at all (new logging lives at
`src/webview/log/`), dead message channels (probe-dumps, trace) and
dead stubs (bookmarks, fold-halo) are gone, and round-2 dead-export
sweep landed (geom.ts, flow-to-spec.ts + tests, fold-activity,
spec-colors, POSITION_EPSILON, markerEndUrl, save.ts sync helpers,
schema EdgeRoute + handler formalism). `TopologyRoot.tsx` audited
and kept as the harness for the substrate end-to-end smoke test.

Net for the session: -473 lines of source/test over two commits
(`025f9df`, `2ca5e59`) plus the handoff update.

Gates green: tsc ✓, build ✓, vitest 114/114 ✓, vocab ✓, LOC ✓.
(Test count: 121 → 114 with the round-trip / fold-activity /
spec-colors / spec-data-roundtrip test files deleted alongside
their functions, then +1 inline assertion removed.)

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

3. **Dead-export sweep, round 2 — done.** Landed in `025f9df`
   (-443 lines: geom.ts, flow-to-spec.ts + tests, fold-activity.ts,
   spec-colors.ts, POSITION_EPSILON, markerEndUrl, save.ts sync
   helpers) and `2ca5e59` (-30 lines: schema EdgeRoute + handler
   formalism block). `substrate-r/TopologyRoot.tsx` audited and
   kept: `r-topology-smoke.test.tsx` is the only end-to-end coverage
   of the substrate cycle (Input emit → wire load → arm → manual-take
   → tick advance), and TopologyRoot is its harness. Live editor
   mounts the same primitives under React Flow, so the test still
   guards real behavior.

## Post-merge

4. **Promote specs into MODEL.md.** Fold `manual-take-model.md` and
   `react-surface-spec.md` content into `MODEL.md`. Delete the
   planning docs.
5. **CLAUDE.md posture note.** Substrate rule was overridden for
   this rewrite. Default posture returns to friction-driven.

## ALWAYS clause

(See handoff.md — same clause applies.)
