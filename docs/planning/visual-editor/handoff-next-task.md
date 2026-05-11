# Next task: finish the collapse-to-one-layer rewrite

**Branch:** `task/collapse-to-one-layer`. Latest commit `6a9e6f9`
(delete dead frame-pump). Not mergeable; remaining items below.

## State at handoff (2026-05-10, session end)

The substrate rewrite is in, the manual-take cycle works end-to-end
in the live VS Code editor (step → pulse arrives at ReadGate → ⌫
button arms yellow → click clears the wire), and the dead host-side
frame-pump has been removed in this session. Gates green:
tsc ✓, build ✓, vitest 222/222 ✓, vocab ✓, LOC ✓.

Frame-pump deletion sweep (commit `6a9e6f9`) removed:
  - `host-shim/run-frames.ts`, `host-shim/serialize-frame.ts`
  - `extension/frame-renderer.ts` and its wiring in `extension.ts`
  - `handle-message.ts` cases: `frame-pause`, `frame-resume`,
    `frame-step`, `pulse-arrived`, `clear-slot` (+ helper)
  - `messages.ts`: `FrameMsg` / `WireFrameMsgState` /
    `NodeFrameMsgState` types and 5 webview→host frame variants
  - `main.tsx` test hooks: `pauseSubstrate`, `resumeSubstrate`,
    `isSubstrateRunning`
  - `test/contracts/{run-frames,run-frames-controls,serialize-frame}.test.ts`

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

## Deletions still owed

3. **Old substrate code.** Audit `substrate/wire.ts`, `wire-loop.ts`,
   `wire-events.ts`, `wire-entity.ts`, `node-loop*.ts`,
   `node-streams.ts`, `match.ts`, `trigger-gate.ts`, `pause-aware.ts`,
   `pause-controller.ts`, `build-wires.ts`, `build-wire-entities.ts`.
   Delete unreferenced files. Keep `substrate/log.ts` (webview uses
   it; already de-required).
4. **Old tests** targeting legacy substrate primitives:
   `host-shim.test.ts`, `recorder.test.ts`, `renderer-adapter.test.ts`,
   `dom-substrate-smoke.test.tsx`, `wire-loop.test.ts`,
   `wire-primitive.test.ts`, `wire-entity-contract.test.ts`,
   `wire-slot-contract.test.ts`, `node-loop*.test.ts`,
   `build-wire-entities.test.ts`, `and-gate-loop.test.ts`,
   `input-loop-await-ready.test.ts`, `join-loop-slot-pacing.test.ts`,
   `pause-controller.test.ts`, `ready-once*.test.ts`. Audit; most can
   be deleted; some may need migration against the new substrate.

## Post-merge

5. **Promote specs into MODEL.md.** Fold `manual-take-model.md` and
   `react-surface-spec.md` content into `MODEL.md`. Delete the
   planning docs.
6. **CLAUDE.md posture note.** Substrate rule was overridden for
   this rewrite. Default posture returns to friction-driven.

## ALWAYS clause

(See handoff.md — same clause applies.)
