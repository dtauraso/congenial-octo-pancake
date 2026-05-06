## 2026-05-05 — view-load race destroys topology files on open

**Branch:** task/view-load-race-guard
**Mode:** debug + fix.

Opened the editor on `topology.json` and saw nothing — no diagram, no pulses.
Investigation found both `topology.json` and `topology.view.json` had been
clobbered by the editor itself: nodes/edges keys missing, just camera +
folds + bookmarks remained. HEAD versions were intact and had to be
restored twice (first restore got re-clobbered when the editor was
reopened).

**Root cause.** Race in the ready→load→view-load sequence. After audit-15
moved positions off the spec onto `viewerState.{nodes,edges}`, the
sidecar (`topology.view.json`) became the sole source of truth for
positions. On startup the host posts `load` synchronously, then
`await sendView()` posts `view-load`. Between them, React Flow renders
the spec with default positions and its initial onMoveEnd fires
`scheduleViewSave()` ([app.tsx:65-68](../../tools/topology-vscode/src/webview/rf/app.tsx#L65-L68))
with `viewerState.nodes` still empty. The debounced save can land
before `view-load` arrives → file written with no nodes block → HEAD
positions destroyed. Subsequent saves drift further.

**Fix.** `performViewSave` and `scheduleViewSave` short-circuit while
`lastViewSyncedText === undefined`. `markViewSynced` is called from
`handleViewLoad` after parsing the sidecar, so the gate flips exactly
when viewerState is fully populated. Three regression tests in
`test/contracts/view-save-load-gate.test.ts`.

**Why this didn't hit pre-audit-15.** Positions used to live on the
spec, so `handleLoad` populated everything in one shot; the view
sidecar carried only camera/folds/selection. An early view-save lost
nothing important. Splitting positions into the sidecar made the
racewindow load-bearing.
