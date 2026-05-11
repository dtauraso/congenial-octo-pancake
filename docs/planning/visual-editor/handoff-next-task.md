# Next task: finish the collapse-to-one-layer rewrite

**Branch:** `task/collapse-to-one-layer`. Latest commit `ad7f1c9`.
Not mergeable; remaining items listed below.

## State at handoff (2026-05-11, session end)

The substrate rewrite is in. Editor's webview runs on the new
React-resident substrate: `SubstrateProvider` wraps App; EDGE_TYPES
and RF_NODE_TYPES point at `RSubstrateEdge` / `RSubstrateNode`;
`TransportControls` calls `driver.halt/resume/step` directly via
context (no postMessage). 233/233 tests pass. 14 commits on branch.

Visual fidelity for nodes restored at `ad7f1c9` — RSubstrateNode now
reads data.fill/stroke/width/height/shape/label, renders per-port
handles tinted by KIND_COLORS, and sources Input queue from
data.nodeData.init. Visual verification in live VS Code editor not
yet done.

## Owed before merge

1. **Visual verification in the live editor.** Load the user's
   working topology in VS Code, click step, observe. Confirm:
   - Input emits, pulse animates along wire to ReadGate.
   - ⌫ button on ReadGate arms when pulse arrives.
   - Clicking advances tick and re-arms for next pulse.
   - Other node types (ChainInhibitor, AndGate, etc., if present in
     the file) render their bodies and handles, even if substrate-
     inert.
   Fix any rendering surprises before proceeding.

2. **Edge visual fidelity.** `RSubstrateEdge` draws a plain gray
   line. Lost vs `AnimatedEdge`: kind colors, dash patterns, route
   variants (line/snake/below), arrow markers, edge labels. Port
   from git history at `87822c1^` — the deleted
   `webview/rf/AnimatedEdge/_geom-build.ts`, `_pulse-label.ts`,
   `_edge-labels.tsx`, and `_constants.ts` hold the pieces.

3. **Other node types' substrate behavior.** Today only Input and
   ReadGate have `node-kinds.tsx` entries. ChainInhibitor, AndGate,
   Partition, EdgeNode, etc. mount with no `<Node>` body — fine for
   the user's current working topology but anything that uses them
   will be inert. Friction-driven posture: port each type only
   when it surfaces in a real session.

## Deletions still owed

4. **host-shim/run-frames.ts frame emission loop.** Webview no
   longer consumes; can delete the frame-pump. Keep host-shim
   itself for spec I/O (save / view-save / topogen-status).
5. **Extension-host postMessage handlers** for `frame-pause`,
   `frame-resume`, `frame-step`, `clear-slot`, `pulse-arrived`.
   Webview no longer sends these.
6. **Old substrate code.** Audit `substrate/wire.ts`,
   `wire-loop.ts`, `wire-events.ts`, `wire-entity.ts`,
   `node-loop*.ts`, `node-streams.ts`, `match.ts`,
   `trigger-gate.ts`, `pause-aware.ts`, `pause-controller.ts`,
   `build-wires.ts`, `build-wire-entities.ts`. Delete unreferenced
   files.
7. **Old tests** that target frame-mode or the legacy substrate
   primitives: `run-frames.test.ts`, `run-frames-controls.test.ts`,
   `host-shim.test.ts`, `serialize-frame.test.ts`,
   `recorder.test.ts`, `renderer-adapter.test.ts`,
   `dom-substrate-smoke.test.tsx`, `wire-loop.test.ts`,
   `wire-primitive.test.ts`, etc. Audit; most can be deleted; some
   may need to be migrated against the new substrate.

## Post-merge

8. **Promote specs into MODEL.md.** Fold `manual-take-model.md` and
   `react-surface-spec.md` content into `MODEL.md`. Delete the
   planning docs.
9. **CLAUDE.md posture note.** Substrate rule was overridden for
   this rewrite. Default posture returns to friction-driven.

## ALWAYS clause

(See handoff.md — same clause applies.)
