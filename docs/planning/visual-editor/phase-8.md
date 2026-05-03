# Phase 8 — polish

**Cap:** ~⅞ scoped + ½ Tier 4 = ~1.375. **$ extra-usage est:** ~$80 (range $40–$140, 1× mixed). Open-ended; ~⅜ saved by React Flow + the AnimatedNode pattern; +~⅜ tests.

- **[~⅛]** Spec undo / redo. (Cheaper than the original ~¼: the "mutate spec → rebuild via `specToFlow` → `setNodes`/`setEdges`" pipeline is already proven by id rename's `rerender` callback; an undo stack of spec snapshots plugs into the same callback.) **Substrate:** use [`zundo`](https://github.com/charkour/zundo), the dominant Zustand undo middleware (~2KB, snapshot-based with built-in grouping/diffing). Wraps the spec store in one line; avoids hand-rolling and maintaining a stack.
- **[~⅛]** Deliberate-viewer undo / redo: folds, saved views, bookmarks. *Not* camera, lastSelectionIds, current playhead, or active-view selection — those are incidental tracking, not deliberate creations, and undoing them is jarring (cf. word processors not undoing scroll position). Same `zundo` substrate, **separate undo stack** so spec and viewer histories are independent: pressing undo with focus in the main pane rolls back spec changes; pressing it with focus in a viewer panel (folds list, saved-views, bookmarks) rolls back that panel's creations. Avoids the surprising case where pressing undo after deleting a saved view also rolls back an unrelated spec edit.
- **[~⅛]** Visual rollback affordance for both undo stacks. After an undo, briefly highlight the affected node/edge/fold/view/bookmark using the diff classNames from Phase 5 (`.diff-added` for re-appearing, `.diff-removed` for un-appearing) plus an optional camera pan to frame the change. Reuses Phase 5's vocabulary — same visual idea, different trigger. Without this, undo is "did something happen?"; with it, undo is "I see exactly what happened." Tier 4 nightly should screenshot a few frames mid-affordance to catch regressions in the highlight timing.
- **[~⅛]** Snap-to-grid; alignment guides. (React Flow has snap-to-grid built in; alignment guides are custom but cheap. Trimmed from ~¼ after the Phase 4 calibration — same shape: library primitive + thin custom layer + no spec touch.)
- **[~⅛]** ⏳ Tier 3 system-shape test: spec undo + fold + delete. Apply a sequence (delete a node, fold a selection, rename, re-fold), step the *spec* undo back across the sequence, assert spec returns to its initial bytes; the viewer-state folds stack should be untouched (deleted folds reappear only when the *viewer* undo is exercised). Catches the bug where the two stacks bleed into each other or where a spec rollback leaves a fold pointing at a now-restored node id incoherently.
- **[~⅛]** ⏳ Tier 2 invariant test: each undo stack is scoped to its own surface. After a spec undo, viewer-state diffs (folds, views, bookmarks, camera, lastSelectionIds) must be byte-identical to pre-undo. After a viewer undo, the spec must be byte-identical to pre-undo. Stronger than the previous "undo only touches spec" rule — has to police *two* surfaces' independence, not one. Promotes the rule from comment to enforced contract.
- **[~½]** ⏳ Tier 4 headline edit-to-running-Go test. Success criterion #1 ("under 30 seconds end-to-end") made executable: scripted gesture + topogen + `go build`, latency measured. Nightly, not per-commit. Catches latency regressions (topogen slowdowns, debounce drift) that no other tier sees.
## Running tally

| Chunk | Commit | $ | est |
|---|---|---|---|
| 1 — Spec undo/redo MVP + Tier 2 invariant | `8ef693f` | $0.73 | $1.20 est, under |
| 2 — Viewer undo + scope routing + diff-added affordance | `f2cd717` | $2.08 | $1.50 est, slightly over |
| 3 — Snap-to-grid + alignment guides + Tier 3 system-shape | _pending_ | $1.88 | $1.20 est, over |

**Chunk 1 — Spec undo/redo MVP** (proposal signed off 2026-05-03):
hand-rolled snapshot stacks (cap 50) wired into `mutateSpec` in
`state.ts` rather than the doc's original `zundo` substrate —
Zustand isn't installed and `mutateSpec` already produces a fresh
top-level reference per edit, so pushing the prior reference is
zero-cost. Cmd/Ctrl-Z and Cmd/Ctrl-Shift-Z (plus Ctrl-Y) walk the
stacks via the existing `specToFlow → setNodes/setEdges` pipeline.
Skipped while a text input is focused or in the read-only
comparison view; fresh spec loads clear history. Tier 2 invariant
test (`spec-undo-invariant.test.ts`) pins: undo restores
byte-for-byte, redo replays, fresh mutation clears redo, viewer
state is byte-identical across undo/redo, empty-stack undo no-ops.
Visual rollback affordance and viewer-side undo deferred to chunk 2.

**Chunk 2 — Viewer undo + scope routing + diff-added affordance**
(proposal signed off 2026-05-03): second snapshot stack
(`mutateViewer` in `state.ts`) wraps the four deliberate viewer
mutations — `saveView`/`deleteView` in `views.ts`,
`addBookmark`/`deleteBookmark` in `timeline.ts`, and the
`createFold`/fold-delete paths in `rf/app.tsx`. Toggle-collapse and
drag-position on existing folds stay incidental, matching the doc's
exclusion of camera/lastSelectionIds. Scope routing tracks
`lastScopeRef` via capture-phase mousedown walking up to
`[data-undo-scope="viewer"]` (set on the views and timeline panel
roots); everything else falls through to spec. Visual affordance
flashes `.diff-added` (Phase 5 vocabulary) on re-appearing
node/edge/fold ids for 1500ms after each undo/redo. Tier 2 invariant
extended: viewer undo doesn't touch spec, no-op viewer mutations
skip the stack push, and a spec undo leaves the viewer stack's
content *and* depth untouched. `.diff-removed` flash and the
optional camera pan from phase-8.md were left unimplemented — items
removed by undo no longer render (no surface to decorate without a
ghost-render pass) and the camera pan is marked optional in the doc.

**Chunk 3 — Snap-to-grid + alignment guides + Tier 3 system-shape**
(proposal signed off 2026-05-03): RF's `snapToGrid` + `snapGrid={[24,24]}`
matches the Background `gap={24}`. Alignment guides are a thin custom
layer: an `onNodeDrag` matcher walks current node centers (flow units,
4-unit tolerance), and two absolutely-positioned `.align-guide` divs
project the match into screen space via the live RF viewport. Cleared
on drag stop. Multi-node selection drags don't get per-node guides
(MVP).

Tier 3 system-shape test (`spec-undo-system-shape.test.ts`) crosses
spec and viewer mutations — edge-kind edit → fold-create → edge-kind
edit → fold-delete — and walks each scope's undo stack independently,
asserting the *other* surface stays byte-identical at every step.
Second case guards against fold memberIds dangling after a spec-only
undo. Sequence intentionally avoids rename and node-delete: both
gestures mutate spec **and** viewerState atomically in one pass and
the current two-stack design doesn't capture cross-surface undo.
Documented as a follow-up gap.

**Phase 8 in-phase bullets done at $4.69 actual** ($8 estimate; well
under). Tier 4 nightly headline edit-to-running-Go latency test
remains deferred per the chunk-2 sign-off.

- *Dropped: SVG export.* The `diagrams/` set is hand-authored to the style guide and the editor itself is the live view — exporting would mean re-implementing the style guide twice (live + export). Revive only when hand-authored diagrams drift from the spec badly enough to hurt; until then, screenshots / recordings cover incidental sharing.
