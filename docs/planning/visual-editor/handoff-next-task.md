# Next task: finish the collapse-to-one-layer rewrite

**Branch:** `task/collapse-to-one-layer`. Latest commit `ea79bf9`
(delete dead sim/trace + TraceState; -240 lines). Prior: `3f8d529`
(delete old substrate, host-shim, renderer, recorder, legacy tests;
-3257 lines). Pushed. Not yet mergeable; remaining items below.

## State at handoff (2026-05-10, session end)

The substrate rewrite is in. The manual-take cycle works end-to-end
in the live VS Code editor (step → pulse arrives at ReadGate → ⌫
button arms yellow → click clears the wire). All legacy substrate
code is deleted: `substrate/wire*`, `substrate/node-loop*`,
`substrate/{node-streams,match,trigger-gate,pause-aware,pause-controller,build-wires,build-wire-entities}`,
and the dead `src/host-shim/`, `src/renderer/`, `src/recorder/`
directories. 18 legacy contract tests were purged. Only
`substrate/log.ts` remains in `src/substrate/` (webview-portable).
`src/sim/` is gone too — trace/seeds were dead since the recorder
purge, and no webview component reads useTrace.

Gates green: tsc ✓, build ✓, vitest 133/133 ✓, vocab ✓, LOC ✓.

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

## Post-merge

3. **Promote specs into MODEL.md.** Fold `manual-take-model.md` and
   `react-surface-spec.md` content into `MODEL.md`. Delete the
   planning docs.
4. **CLAUDE.md posture note.** Substrate rule was overridden for
   this rewrite. Default posture returns to friction-driven.

## ALWAYS clause

(See handoff.md — same clause applies.)
