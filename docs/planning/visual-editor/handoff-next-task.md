# Next task: finish the collapse-to-one-layer rewrite

**Branch:** `task/collapse-to-one-layer`. Continue on this branch.

## State at end of last session (commits 09ada85, 87822c1)

The editor's webview bundle now runs on the new React-resident
substrate. EDGE_TYPES.animated → RSubstrateEdge, RF_NODE_TYPES.animated
→ RSubstrateNode, App wrapped in SubstrateProvider. TransportControls
calls driver.halt/resume/step directly via context (no postMessage).
AnimatedEdge, AnimatedNode, ClearSlotButton, and frame-store have
been deleted (24 files, 1315 LOC). 233/233 tests passing.

## Known regressions (mid-rewrite)

These are accepted per the structural-rewrite override and need
fixing before merge:

1. **Visual fidelity of nodes.** `RSubstrateNode` renders a minimal
   body (single rect, label, two handles). The legacy `AnimatedNode`
   rendered multiple ports per side, KIND_COLORS-tinted handles,
   fold panels, spec panels, four-state painter colors. Port this
   styling into `RSubstrateNode` from the (deleted) helpers — refer
   to git history at `87822c1^` for the `_styles.ts`, `NodeBody.tsx`,
   `SpecPanel.tsx` modules.

2. **Edge visual fidelity.** `RSubstrateEdge` draws a plain line in
   `#888`. Legacy `AnimatedEdge` used KIND_COLORS, dash patterns per
   kind, route variants (line/snake/below), arrow markers, and edge
   labels. Port from git history.

3. **Input node initial queue.** RSubstrateNode reads
   `data.initialQueue`. The spec adapter (`spec-to-flow.ts`) doesn't
   set this field today — it has to project the Input node's spec
   into `initialQueue` so the substrate has values to emit. Check
   how the old substrate sourced Input values.

4. **Non-Input/non-ReadGate nodes render nothing substrate-side.**
   ChainInhibitor, AndGate, etc. mount with no `<Node>` kind. Either
   port their behavior into `node-kinds.tsx` (per the model
   re-derivation discussed mid-session) or omit them from the user's
   working spec until they're ported.

## Deletions still owed

5. **host-shim/run-frames.ts** frame emission loop. Webview no
   longer consumes; can delete the frame-pump. Keep the host-shim
   itself for spec I/O.
6. **Extension host postMessage handlers** for `frame-pause`,
   `frame-resume`, `frame-step`, `clear-slot`, `pulse-arrived`.
   Webview no longer sends these.
7. **Old substrate tests** that target frame-mode or the legacy
   substrate primitives (`run-frames.test.ts`,
   `run-frames-controls.test.ts`, `host-shim.test.ts`,
   `serialize-frame.test.ts`, `recorder.test.ts`,
   `renderer-adapter.test.ts`, `dom-substrate-smoke.test.tsx`,
   etc.). Audit; most can be deleted.
8. **Old substrate code.** `substrate/wire.ts`, `wire-loop.ts`,
   `wire-events.ts`, `wire-entity.ts`, `node-loop*.ts`,
   `node-streams.ts`, `match.ts`, `trigger-gate.ts`,
   `pause-aware.ts`, `pause-controller.ts`, `build-wires.ts`,
   `build-wire-entities.ts` — audit each for remaining importers
   and delete what's unreferenced.

## Spec promotion

9. Fold `manual-take-model.md` and `react-surface-spec.md` content
   into `MODEL.md` once the rewrite is verified working end-to-end
   in the editor. Delete the planning docs.
10. Update CLAUDE.md posture: substrate rule was overridden for this
    rewrite; default posture returns to friction-driven.

## Order recommendation

Verify the editor visually first (load it, click step, observe).
Fix #3 (Input queue source) so the substrate has data. Then #1+#2
to make it look right. Then prune #5–#8. Then #9–#10.

## Branch is not mergeable to main yet

The editor visual is broken until #1–#3 land. Keep the branch
unmerged; restore visual fidelity before considering merge.

## ALWAYS clause

(See handoff.md — same clause applies.)
