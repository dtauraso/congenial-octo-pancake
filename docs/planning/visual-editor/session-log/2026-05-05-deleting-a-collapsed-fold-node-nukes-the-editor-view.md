## 2026-05-05 — deleting a collapsed fold node nukes the editor view

**Branch:** task/fold-delete-crash
**Mode:** edit
**Duration:** ~5m (initial report)

- User selected a fold node in folded mode and pressed delete. Almost
  the entire editor vanished. Recovering required removing the
  topology diff overlay AND reloading the topology.json tab.
- No probe dump was produced (.probe/ entries are stale from the
  pulse-rules investigation). No console error was captured.

**Hypothesis (from code read, not yet verified):**

`onNodesDelete` at [tools/topology-vscode/src/webview/rf/app/_handle-delete.ts:27-42](../../tools/topology-vscode/src/webview/rf/app/_handle-delete.ts#L27-L42)
treats a fold-type RF node as viewer-only: it removes the fold from
`viewerState.folds` and rebuilds the flow. It does **not** delete the
members from the spec, by design.

But on rebuild via
[spec-to-flow.ts:70-80](../../tools/topology-vscode/src/webview/rf/adapter/spec-to-flow.ts#L70-L80),
each member's RF position falls back to `vs.nodes?.[n.id]?.x ?? 0`
(and `?? 0` for y). Members that lived inside a collapsed fold and
were never individually positioned in `viewerState.nodes` therefore
render at (0,0). All members of the just-deleted fold stack at the
origin, looking "vanished" from a viewport panned elsewhere.

The diff-overlay aggravation is likely
[decorateForCompare / decorateForOnion](../../tools/topology-vscode/src/webview/rf/app/_decorate.ts)
holding stale references to the fold id, which is why removing the
diff (plus reloading the tab) is what cleared it.

**Resolution:** the actual root cause (confirmed by an in-process
diagnostic that tracked every keydown / RF node-change event for the
fold) was that **React Flow v11 silently dropped the Backspace
keypress** when a fold-placeholder div was the active element. RF's
internal `useKeyPress` treats focus-on-the-node-DOM as "user is
interacting with the node, don't fire global delete". Selection fired,
keydown fired (defaultPrevented=false), but no `remove` change ever
materialised — and therefore `onNodesDelete` never ran, so the fold
was never deleted. The "vanishing" symptom was the absence of any
visible feedback; the topology-diff overlay reload masked it because
reload re-created the RF state from scratch.

Fix: a webview-level keydown handler at
[tools/topology-vscode/src/webview/rf/app.tsx](../../tools/topology-vscode/src/webview/rf/app.tsx)
that, on Backspace/Delete, dispatches `delH.onNodesDelete` directly
for any selected fold node, bypassing RF's quirk.

A secondary bug surfaced during investigation:
`decorateForCompare` / `decorateForOnion` called `specToFlow` with an
empty viewer-state, dropping member positions to (0,0) under the diff
overlay. Fixed in the same branch by threading `viewerState`
through.
