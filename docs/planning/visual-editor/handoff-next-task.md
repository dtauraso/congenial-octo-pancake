# Next task: edge visual fidelity on RSubstrateEdge

**Branch:** open a fresh `task/<short-kebab>` off `main`.
`task/collapse-to-one-layer` was merged. Specs are in MODEL.md.

## State at handoff (2026-05-11, end of session)

The collapse-to-one-layer rewrite is on `main`. Substrate has no
logging code (new logging lives at `src/webview/log/`), dead message
channels and stubs are gone, dead exports are gone, and the two
planning specs (`manual-take-model.md`, `react-surface-spec.md`) are
folded into [MODEL.md](../../../MODEL.md) and deleted.

Gates at merge: tsc ✓, build ✓, vitest 114/114 ✓, vocab ✓, LOC ✓.

## Owed

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

## ALWAYS clause

(See handoff.md — same clause applies.)
