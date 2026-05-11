# Next task: finish the collapse-to-one-layer rewrite

**Branch:** `task/collapse-to-one-layer`. Latest commit `2cb806b`.
Not mergeable; remaining items listed below.

## State at handoff (2026-05-10, session end)

The substrate rewrite is in and the manual-take cycle works end-to-end
in the live VS Code editor. David confirmed: step moves a pulse to
ReadGate; the white ⌫ button next to ReadGate's label turns yellow
when the pulse arrives and is clickable. Visual verification of the
core 2-node cycle: ✓.

Two non-obvious bugs surfaced and were fixed at `2cb806b`:
  - `SubstrateProvider` context value was memoed on stable callbacks
    only, so registry version bumps did not re-render consumers →
    `RSubstrateNode` kept `inWireRef = NULL_REF`. Fixed by including
    `version` in the value memo deps.
  - `<Node>`'s manual-take phase subscription effect depended only on
    input ids, so it never re-fired when `wireRef` identity changed
    from NULL_REF to the real handle. `<Node>` is now render-less;
    phase subscription moved into `ManualTakeButton` keyed on wireRef.

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

3. **host-shim/run-frames.ts frame emission loop.** Webview no
   longer consumes; can delete the frame-pump. Keep host-shim
   itself for spec I/O (save / view-save / topogen-status).
4. **Extension-host postMessage handlers** for `frame-pause`,
   `frame-resume`, `frame-step`, `clear-slot`, `pulse-arrived`.
   Webview no longer sends these.
5. **Old substrate code.** Audit `substrate/wire.ts`,
   `wire-loop.ts`, `wire-events.ts`, `wire-entity.ts`,
   `node-loop*.ts`, `node-streams.ts`, `match.ts`,
   `trigger-gate.ts`, `pause-aware.ts`, `pause-controller.ts`,
   `build-wires.ts`, `build-wire-entities.ts`. Delete unreferenced
   files.
6. **Old tests** targeting frame-mode or legacy substrate primitives:
   `run-frames.test.ts`, `run-frames-controls.test.ts`,
   `host-shim.test.ts`, `serialize-frame.test.ts`,
   `recorder.test.ts`, `renderer-adapter.test.ts`,
   `dom-substrate-smoke.test.tsx`, `wire-loop.test.ts`,
   `wire-primitive.test.ts`, etc. Audit; most can be deleted; some
   may need migration against the new substrate.

## Post-merge

7. **Promote specs into MODEL.md.** Fold `manual-take-model.md` and
   `react-surface-spec.md` content into `MODEL.md`. Delete the
   planning docs.
8. **CLAUDE.md posture note.** Substrate rule was overridden for
   this rewrite. Default posture returns to friction-driven.

## ALWAYS clause

(See handoff.md — same clause applies.)
