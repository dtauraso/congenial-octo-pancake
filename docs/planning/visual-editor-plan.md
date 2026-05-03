# Visual Topology Tool: design surface for the Go code

The active plan. The tool is the **design surface where decisions about
the Go code get made**. You sketch the topology visually because sketching
is how you decide what the Go code should be; `topogen` mechanically
translates that decision into Go; the Go code is the deliverable.

The pipeline:

```
visual editor  →  topology.json  →  generated Go  (topogen)  →  running system
                                                                       ↓
                                                              (future) trace
                                                                       ↓
                                                            replays into editor
```

Editing the diagram is editing the spec; editing the spec regenerates code.
The visual tool's value is in how fast a design decision becomes running Go.
Comprehension and re-load matter because they enable iteration on the
design — not as ends in themselves.

The trace-replay plan ([trace-replay-plan.md](trace-replay-plan.md)) is the
rightmost arrow in this pipeline. Deferred until the visual → spec → Go
loop runs smoothly; will rejoin as a later phase of the same tool, not as
a separate project.

---

## What the tool is for, in priority order

1. **Letting design decisions become code fast.** A change in the visual
   editor should produce updated Go within seconds. This is the load-bearing
   value of the tool.
2. **Holding the design stable across sessions** so you can come back to it
   without re-deriving. Spatial memory + saved views + bookmarks make the
   diagram a durable working surface.
3. **Replaying the dynamic story** as a refresher dose for "what happens
   when input arrives." Animation is comprehension, not decoration.
4. ~~**Producing diagram artifacts** (SVG export) for sharing or
   documentation.~~ *Dropped — see Phase 8.* Hand-authored `diagrams/`
   cover the documentation case; the editor is the live view.

When design conflicts arise, tie-break toward whichever serves design
throughput best.

## Spec vs viewer state

A critical distinction that the previous draft conflated. Two storage
surfaces:

**`topology.json` — the spec.** Round-trips through `topogen`. Every field
in this file is something the generated Go code reads or depends on. Adding
a node here means a new goroutine in the generated code; adding an edge
means a new channel; setting a port means a new wiring. Nothing else
belongs in this file.

**`topology.view.json` — viewer state, sidecar.** Saved views, bookmarks,
fold/unfold state, last camera position, animation playback preferences.
Anything that's about *how you look at* the topology rather than *what the
topology is*. `topogen` ignores this file. Optional; if missing, defaults
apply. Lives next to the spec but is not a dependency of the running
system.

This split keeps the spec clean (and code-gen deterministic) while still
allowing rich UI state to persist across sessions.

### Spec fields

The existing schema (nodes, edges, ports, kinds, roles, `timing.steps`)
plus, when needed:

- `positionKeyframes` on nodes that move during the cycle
- `endpointKeyframes` on edges that rewire
- `visibility` keyframes for nodes/edges that appear/disappear

Whether keyframes are spec or viewer is a judgment call: if the moving /
rewiring is *part of the simulation's behavior* (the Go runtime causes
it), keyframes belong in the spec and `topogen` reads them. If it's purely
a presentation animation that the runtime doesn't produce, they're viewer
state. Default: spec, on the assumption that animated change reflects
real Go-side change.

### Viewer state fields

```jsonc
{
  "views": [
    {
      "name": "detector subsystem",
      "viewport": { "x": 200, "y": 50, "w": 600, "h": 400 },
      "nodeIds": ["sbd0", "sd0", "sbd1", "sd1", "a0"]
    }
  ],
  "folds": [
    { "id": "fold-detectors", "label": "detectors",
      "memberIds": ["sbd0", "sd0", "sbd1", "sd1"],
      "position": [600, 100], "collapsed": true }
  ],
  "bookmarks": [
    { "name": "ack returns", "t": 0.913 }
  ],
  "camera": { "x": 0, "y": 0, "zoom": 1.0 },
  "lastSelectionIds": ["i0"]
}
```

## Codegen integration

The pipeline is broken if editing the diagram doesn't produce running Go.
Bring `topogen` into the editing loop from day one.

**On every spec save:**
1. Plugin invokes `topogen` (already wired via `runTopogen` in
   `extension.ts`, currently fire-and-forget).
2. Output Go files are written to their canonical location.
3. The plugin surfaces a status indicator: green when generated code
   matches the current spec, amber while regenerating, red on
   `topogen` error.
4. Errors from `topogen` (parse failures, unsupported topology) appear
   inline near the offending node/edge, not just in the output panel.

**Debounce and ordering:** debounce ~250ms, but never let two `topogen`
runs overlap; if a save fires while one is running, queue the latest spec
and re-run when the current finishes.

**Build / run:** the editor doesn't need to compile or run the Go binary,
but should expose a one-click "build and run" that invokes
`go run ./cmd/...` and surfaces the result. This is the moment a
design decision becomes observable behavior; making it one click matters
for iteration speed.

## Editing decisions that affect code shape

Some authoring gestures aren't just visual — they're declarations
`topogen` will translate into Go. The plan should be explicit about which
ones, so the editor exposes the right level of detail.

| Gesture | What `topogen` will generate |
|---|---|
| Drag-add a node | New struct + goroutine + run-loop |
| Drag-connect a port | New channel; type inferred from port spec |
| Set port direction | Channel direction in struct field |
| Pick node role | Struct embedded type or behavior preset |
| Set channel buffer size (advanced) | `make(chan T, N)` capacity |
| Mark edge as feedback-ack | Generated wiring that closes the loop |

For most of these, sane defaults are enough; the editor doesn't need to
expose buffer sizes on day one. But the plan should treat the editor as a
**declarative front-end for code generation**, not a paint program. Every
gesture has a code consequence.

## Design criteria

What the tool is judged against:

- **Codegen latency under one second.** Edit → updated Go visible
  immediately. Beyond ~one second, the loop breaks down and the editor
  feels like a documentation tool instead of a design tool.
- **Stable spatial layout** across sessions. Re-load relies on spatial
  memory; never auto-shift positions.
- **Spec-vs-viewer cleanliness.** No viewer state contaminates
  `topology.json`. Diffs in the spec file represent real design changes.
- **Glanceability.** Color = role, shape = role-class, edge style = kind.
  Stable visual semantics so the spatial map carries meaning.
- **Saved views, bookmarks, fold/unfold** for re-load fluency.
- **Errors surface where they happen.** A `topogen` failure highlights
  the offending node/edge, not a wall of stderr.

## What you can do in it

Things a normal graph editor doesn't do:

- **Edit the diagram and get updated Go within a second.** The diagram *is* the source; `topogen` regenerates code on every save.
- **Replay the dynamic story** — animate inputs cascading through the topology, with bookmarks on the timeline to jump to interesting moments.
- **Trust spatial memory across sessions.** Positions never auto-shift; saved views and folds survive reloads exactly as left.
- **Read role from appearance.** Color = role, shape = role-class, edge style = kind, so the spatial map carries meaning at a glance.
- **See codegen failures on the offending node/edge** rather than as a wall of stderr (Phase 1 partial — structured error attribution still pending).

## Rendering substrate: React Flow inside the vscode webview

The previous `tools/topology-editor/` (standalone browser, React Flow) was deleted because it lived in a browser — wiring Claude Code chat into it would have been more work than building a vscode plugin (Claude Code's own suggestion). React Flow itself was not the problem. Adopting React Flow **inside** the existing vscode webview — with `topogen` still authoritative — replaces large parts of Phases 3, 4, and 8 with library-provided primitives:

- **Phase 3** selection (click / shift-click / marquee), port-drag edge creation, node palette drag-to-create — all built in.
- **Phase 4** fold geometry — React Flow's subflow / parent-node primitive covers most of the edge-re-routing work.
- **Phase 8** undo/redo — standard with React Flow + a state-management layer (Zustand).

What stays custom (React Flow does not help):

- `topogen` invocation, spec/viewer split, status indicator.
- Animation timeline + bookmarks (Phase 2 — already shipped).
- Keyframed motion + record-mode editor (Phase 6).
- Trace replay (Phase 7).

**Migration cost (one-time):** ~1.5 caps to port the existing webview, write adapters between `topology.json` ↔ React Flow's node/edge model, and restyle to match the SVG style guide where possible.

**Net effect on remaining work:** ~3 caps saved across Phases 3, 4, 8 — see updated estimates below.

## Implementation phases

Reordered around the pipeline. Codegen integration is in Phase 1 because
the tool's value collapses without it.

### ▶ NEXT UP

The most load-bearing remaining work, in priority order. Pick whichever
matches the cap available and the kind of break you'd most regret.

1. **Phase 4.5.1 Tier-1 (data-loss bugs) ✅ [~¾ est / ~¼ actual].** All
   five fixes shipped: sidecar writes via `WorkspaceEdit` + flush on
   hidden (C1), single shared view-save debouncer (C2), `applyEdit`
   /`save` rejection caught and posted as `save-error` (H3), suppression
   by `document.version` rather than text equality (C3), regular-node
   drag positions persisted to `spec.nodes[i].x/y` (H9). Underran the
   ~¾ estimate — the changes were narrow and the existing test surface
   covered them; remaining 4.5 bands (correctness, packaging, hygiene,
   test coverage) still ⏳ but no longer gate Phase 5.
2. **Phase 5 — comparison [~1.5 + ~⅜ tests].** The headline next phase.
   Side-by-side diff against git HEAD or a second spec. See the Phase 5
   entry below for the open questions and the per-phase test items
   (Tier 2 invariants + Tier 3 system-shape cases) that promote the
   spec/viewer/topogen contracts from rules-in-doc to enforced tests.
3. **Phase 4 nested folding follow-up [~½, ⏳].** Single-level folds work;
   nested ones still rejected. Pick up only when a real topology hits
   the level-of-nesting wall.
4. **Phase 3 Tier 3 follow-ups [~⅜ remaining, ⏳].** Three cases queued:
   port-drag asserts `chan` materializes in generated Go (~⅛),
   palette-drag-position (~⅛, deferred — pixel-stable assertion is
   harder), port-drag mismatched-kinds fallback (~⅛). Lower leverage
   than Phase 5; pick up opportunistically when touching adjacent code.

The done-recently items that justify Phase 5 starting next: Phase 4
shipped at ~⅜ actual, follow-up gesture fixes shipped, Tier 3 fold +
delete + rename-clash gesture coverage in place. The combinatorial-bug
surface is currently small enough that adding one new pane (Phase 5)
won't blow the budget; deferring much longer means more to integrate.

Cap-hit estimates in **[brackets]** at each phase and item. See [Risk and effort](#risk-and-effort) for the methodology. Phases 3, 4, and 8 estimates assume the React Flow substrate above.

- **Phase 1 — pipeline foundations ✅** **[~2, done; React-Flow-affected items re-ported during Phase 3 migration]**
  - **[~1]** Tighten codegen integration: structured `topogen` invocation on debounced save (250ms, queued, no overlap); status indicator (green / amber / red). *Inline error surfacing on the offending node/edge deferred — topogen errors are bare strings, would need a structured error format to attach to specific node IDs.* **Renderer-independent — survives React Flow migration unchanged.**
  - **[~½]** Spec/viewer split: `topology.view.json` sidecar with `camera`, `views`, `folds`, `bookmarks`, `lastSelectionIds`. No migration needed — `topology.json` had no viewer fields. **Renderer-independent — survives unchanged. React Flow's `folds` representation will use its subflow primitive, but the sidecar schema is the same.**
  - **[~½]** Lock down stable-layout invariants: pan/zoom debounced-saves to sidecar; camera restored on load; node positions never auto-shift. **Re-port required: wire React Flow's `onMove` / `onNodeDragStop` to the existing sidecar persistence. Folded into the Phase 3 migration estimate.**

- **Phase 2 — recall affordances ✅** **[≤2, done; React-Flow-affected items re-ported during Phase 3 migration]**
  - **[~½]** Saved views: top-right panel, "+ save current" with inline name input, click-to-frame, non-member dim, pan/zoom clears the dim. Membership is bounding-box overlap with current viewport. **Re-port required: replace direct SVG bbox math with React Flow's `getNodes()` + `setViewport()` / `fitView()`; non-member dim becomes per-node className via React Flow's `nodes` prop. Folded into the Phase 3 migration estimate.**
  - **[~1]** Bookmark markers on the animation timeline: bottom timeline with play/pause/scrub, "+ bookmark" pauses and prompts for a name at the current playhead, click marker to jump-and-pause, shift-click to delete. Refactored `animation.ts` onto a master playback clock. **Master clock survives unchanged. Re-port required for how animation drives node visual state: push per-frame node state into React Flow via `setNodes()` instead of mutating SVG attrs directly. Folded into the Phase 3 migration estimate.**
  - **[~½]** One-click "build and run": "▶ run" button in the toolbar spawns `go run .` and streams stdout/stderr to a "topology run" output channel; button toggles to "■ stop" while running, status pill shows running/ok/error/cancelled. **Renderer-independent — survives unchanged.**

- **Phase 3 — structural editing (mental-model sync → code change)** **[~½ remaining; migration tail came in ~¾ vs. ~½ estimate, testing foundation done, Tier 3 harness came in ~¼ vs. ~¾ estimate]**
  - 🟢 Testing foundation (Tier 1 contract tests — prerequisite to further Phase 3 / Phase 9 work). See [Testing strategy](#testing-strategy) for the bar. **[~1 total, done]**
    - **[~¼, done]** ✅ *Spec round-trip* (Vitest, `tools/topology-vscode/test/round-trip.test.ts`). Fixtures under `test/fixtures/specs/`: minimal 2-node, full-fields (every currently-dropped field — `notes`, `route: snake`, `lane`, named ports — marked `it.fails` so the Phase 9 gap is a tracked failing test rather than a paragraph), plus the live `topology.json` read at test time. Round-trip via `specToFlow()` / `flowToSpec()` in `rf/adapter.ts`.
    - **[~¾, done]** ✅ *Topogen goldens* (Go, `cmd/topogen/testdata/`). Each case is a `spec.json` + `expected/Wiring.go` pair; `TestGolden` diffs against expected, `-update` rewrites. `TestGoldenBuilds` writes generated output into a temp module that `replace`s the parent module and runs `go build ./...` — generated code is guaranteed to compile against the real node packages, not just match bytes. Seed cases: canonical spec (live `topology.json`), renamed-ids spec (locks in the `Name` field wiring), feedback-ack spec.
    - **[~⅛, done]** ✅ Tier 2 retro: id-rename atomicity unit test (`test/rename.test.ts`, table case across edges / `timing.fires` / `timing.state` keys / view `nodeIds` / fold `memberIds` / `lastSelectionIds`, plus reject-on-clash and reject-on-invalid-ident). Locks down the already-shipped rename feature against partial-overlap regressions. Required extracting `applyRename` into `rename-core.ts` so tests don't pull in DOM imports.
    - **[~⅛, done]** ✅ Tier 2 retro: legacy `{x,y,w,h}` → RF `{x,y,zoom}` camera conversion table case (`test/camera.test.ts`). Required extracting `viewportToBox` / `boxToViewport` into `rf/camera.ts`.
  - 🟢 React Flow migration (commits `70356ea`, `e449fcc`).
    - **[~1.25, done]** ✅ RF substrate inside the webview; spec ↔ RF node/edge adapter; camera persistence in RF-native `{x,y,zoom}` (legacy `{x,y,w,h}` viewBox cameras auto-convert on load); saved-views frame + dim re-ported via a renderer-agnostic bridge (`rf/bridge.ts`) so legacy `view.ts` / `views.ts` stay largely intact; saved-view membership is now selection-first (RF `onSelectionChange` capture) with viewport-containment fallback; pan is free while a view is active; click an active view to clear; edge pulses via a custom `AnimatedEdge` (RF `getBezierPath`) with WAAPI registered against the master playback clock — pulses survive RF re-renders because they live in React's tree, not as foreign DOM children; node id rename re-ported (centered input via RF `onNodeDoubleClick`); esbuild builds JSX, bundles CSS, minifies non-watch (1.4 MB → 353 KB). Removed dead lit-html-only files.
    - **[~¾, done]** ✅ (estimated ~½, actual ~¾ — frame-mismatch tax: input/label alignment under viewport scale, edge-to-handle gaps, pulse desync after selection re-mounts) Custom `AnimatedNode` owns the per-node flash overlay (WAAPI registered against the master clock) and `state.field=value` text (subscribes to the playback clock). Adapter precomputes `fireTimes` + `stateFields` segments. SVG overlay inside `.react-flow__viewport` removed; `render/animation.ts` trimmed to `resetAnimations`. Rename input rewritten as `contenteditable` directly on the `.node-label` div — same DOM element, same RF transform, no positioning math, so font/scale/zoom can't drift. Handle styling pinned to `left:0` / `right:0` (no `min-width`) so edges meet nodes flush. Nodes use `width:max-content` + `minWidth:data.width` so longer ids grow the box. Stability: `registerAnimation` returns a disposer that splices on cancel (no unbounded growth across re-renders) and seeds `currentTime` from the live `getCurrentMs()` (animations registered mid-playback after a selection-driven re-mount stay in sync — pulses no longer slip out of their visible window).
  - **[~⅛, done]** ✅ Selection model (click, shift-click, marquee). RF's built-in selection wired to the viewer-state sidecar (`lastSelectionIds`) so selection survives reload. Tuned to `SelectionMode.Partial` so marquee selects on intersection, not full containment — fixes the "box clips a node and misses it" inconsistency. Pan stays on left-drag (default), marquee on shift+drag.
  - **[~⅛, done]** ✅ Delete-to-remove for selected nodes/edges. `applyDelete` in [delete-core.ts](../../tools/topology-vscode/src/webview/delete-core.ts) cascades incident edges and scrubs every reference site (`timing.fires`/`departs`/`arrives`/`state` keys, `view.nodeIds`, `fold.memberIds`, `lastSelectionIds`); Tier 2 retro [test/delete.test.ts](../../tools/topology-vscode/test/delete.test.ts) locks the contract. Delete key = `Delete` only (Backspace excluded so it doesn't fight the rename contenteditable). End-to-end manual verification unblocked by the node-palette landing alongside it (select → delete → re-add via palette → confirm codegen + saved-view membership stay coherent).
  - **[~½, done]** ✅ Port rendering on nodes; drag-from-port-to-port to create edges. `AnimatedNode` renders one `<Handle>` per declared input/output from `NODE_TYPES[type]`, distributed along the left/right edge and colored by `KIND_COLORS[port.kind]`. Adapter stops dropping `sourceHandle`/`targetHandle` so edges anchor to the named ports. `onConnect` infers edge `kind` from the source port (falls back to `"any"` on mismatch), rejects duplicate target-port wires (1-to-1 input invariant; outputs may still fan out), mints a unique edge id, and synthesizes a Go-ident `label` so topogen can use it as the channel variable name. Edge hit-targets widened to `interactionWidth={28}` plus hover/selected stroke-bumps in CSS so users can actually click thin bezier curves.
  - **[~⅛, done]** ✅ Edit existing edges: drag an endpoint to a different port/node to reroute (RF `onEdgeUpdate`/`Start`/`End`); same duplicate-target-port check as `onConnect`, with the edge being rerouted excluded so re-dropping on its own port doesn't self-reject; drop-in-empty-space leaves the edge intact. Right-click an edge for a context menu of the 10 `EdgeKind` options (current kind highlighted with ✓). Reroute updates `source`/`sourceHandle`/`target`/`targetHandle` and re-infers `kind` from the new source port; menu updates `kind` only. `id` and `label` stay stable. Verified topogen end-to-end on a rerouted spec.
  - **[~¼, done]** ✅ Node palette with drag-to-create. Left-side `NodePalette` lists every entry in `NODE_TYPES` with a color-swatch preview keyed by each type's `fill`/`stroke`/`shape`. HTML5 drag carries the type via a private mime (`application/wirefold-node-type`); pane `onDrop` resolves the screen point to flow coords via RF's `screenToFlowPosition`, mints a unique id (`<typeLowercase><n>`, validated against `IDENT_RE` from `rename-core`), pushes to `spec.nodes`, rebuilds via `specToFlow`, and triggers the debounced save so topogen picks it up. New nodes render immediately with their declared ports + default fill/stroke/shape because the spec→flow path is already keyed off `NODE_TYPES[type]`. Closes the destructive-delete loop on the previous entry (delete is now reversible via re-add).
  - 🟢 In-place text editing for annotation and labels.
    - **[~1, done]** ✅ Node id rename: double-click a node, type new id, Enter to commit. Atomically rewrites edges (source/target), `timing.fires`, `timing.state` keys, and viewer state (saved-view nodeIds, fold memberIds, lastSelectionIds). Validates against topogen's safe-Go-ident regex.
    - **[~⅛, done]** ✅ Sublabel in-place editing. `node-sublabel` div in `AnimatedNode` becomes contenteditable on double-click (routed by `onNodeDoubleClick` checking `target.closest('.node-sublabel')` so id-rename still wins on the label); Enter commits, Esc cancels. Empty sublabel renders a faint `+ sublabel` placeholder when the node is selected, so adding one has the same affordance as editing one. `sublabel.ts` mirrors `rename.ts`; commit trims and treats empty as `delete node.sublabel` to keep the spec clean (no IDENT_RE check — it's free text). Verified end-to-end: topogen never reads `sublabel`, so editing one produces a byte-for-byte identical `Wiring.go` (diff against baseline is empty); round-trip test still passes (`sublabel` was already a tracked field). **`spec.notes[]` editing deferred to Phase 9** — the adapter currently drops notes entirely, so wiring note editing would also need adapter + render work, exceeding ~⅛; Phase 9 already lists `notes` rendering, so note editing lands there once notes are visible at all.
  - 🟡 Each gesture verified end-to-end. (Folded into each gesture's estimate.)
    - ✅ Verified for id rename: every wired node struct gained a `Name string` field; topogen emits `Name: "<n.id>"`; each node's `Update` prints `n.Name` instead of a hard-coded prefix, so a rename in the editor shows up directly in the run log. (Side benefit: the spec id is now the runtime identity, not just a code-gen variable name.)
    - ⏳ Verification for the remaining gestures lands with each one as it's built.
  - 🟡 Tier 3 gesture integration tests (Playwright, after the gestures above stabilize — defer until churn slows). **[~⅝ total — was ~1–1.5; harness landed in ~¼ vs. ~¾ estimate, so the four follow-ups (~⅛ each = ~½) dominate what's left]**
    - **[~¾ est / ~¼ actual, done]** ✅ Playwright + vscode-webview harness; first gesture case (port-drag-creates-edge). The harness was the load-bearing risk — option (a) (standalone HTML + stubbed `acquireVsCodeApi`) collapsed cleanly because esbuild already emits a self-contained `out/webview.{js,css}` bundle, so the harness is ~50 lines of HTML and the test runs in ~3s with no vscode dependency. The ~¾ estimate reserved budget for a `@vscode/test-electron` fallback that didn't end up needed. **Recalibration:** future Tier 3 cases should be ~⅛ each as planned — but if a case touches host-side fidelity (real workspaceEdit, real sidecar) the option (a) path won't reach it, and (b) reappears at the original ~¾ cost. None of the four queued follow-ups need that. Standalone HTML shell ([e2e/harness.html](../../tools/topology-vscode/e2e/harness.html)) loads the same `out/webview.{js,css}` bundle the real extension does, with `acquireVsCodeApi` stubbed to record posted messages and replay `{type:"load"}` after `ready`. Webview exposes `window.__wirefold_test.{getSpec,getSent}` so tests assert both the live spec mutation and that a save was posted to the host. Tradeoff: gives up host-side workspaceEdit / sidecar fidelity (already covered by Tier 1 round-trip + topogen goldens); keeps gesture-to-spec edge cheap and fast (~3s for the seed test, no vscode download). `npm test` (Vitest) stays the default and unchanged; `npm run test:e2e` is opt-in. Browsers install once via `npx playwright install chromium`. Four follow-up cases stubbed as TODO comments in [e2e/port-drag-creates-edge.spec.ts](../../tools/topology-vscode/e2e/port-drag-creates-edge.spec.ts).
    - **[~⅛]** ⏳ Port-drag creates edge with inferred channel type; topogen-generated Go contains the new `chan`. (The seed case in the harness sub-bullet above already asserts the spec-mutation half — kind inference, handle ids, save round-trip; this entry stays ⏳ until it also asserts the `chan` materializes in the generated Go.)
    - **[~⅛, done]** ✅ Delete-selection removes node + incident edges + `timing.fires[id]` ([e2e/delete-cascade.spec.ts](../../tools/topology-vscode/e2e/delete-cascade.spec.ts)). Selection pre-set via `__wirefold_view_fixture` so the test doesn't depend on flaky UI click-to-select; gesture path from `Delete` keypress to spec mutation is end-to-end verified.
    - **[~⅛]** ⏳ Palette-drag at coords persists position across reload. Deferred — positional correctness is harder to assert deterministically without pixel-measurement against a viewport-zoom-stable layout. Worth picking up alongside any visual-regression work in Phase 9.
    - **[~⅛, done]** ✅ Rename to clashing id rejects with inline error ([e2e/rename-clash.spec.ts](../../tools/topology-vscode/e2e/rename-clash.spec.ts)). Dialog-event capture asserts the alert fires; spec is byte-identical pre/post (rejection means no mutation).
    - **[~⅛]** ⏳ Port-drag with mismatched kinds falls back to `"any"`. Lower leverage than the others — exercises a fallback path rather than a load-bearing invariant. Pick up opportunistically.

- **Phase 4 — fold/unfold ✅** **[~1 est / ~⅜ actual]**
  - **[~½ est / ~¼ actual, done]** ✅ Sidecar `folds[]` rendered as a separate RF node alongside members (rejected `parentNode` — relative-coordinate complexity vs. the stable-layout invariant). Collapsed members + their internal edges are skipped in the flow; edges crossing the boundary are rerouted to the placeholder *only in the flow* (spec edges keep their original endpoints, so expand reinstates the original wiring without spec mutation). Tier 2 retro [test/fold.test.ts](../../tools/topology-vscode/test/fold.test.ts) locks the contract: collapsed-render, expanded frame, no-spec-mutation, flowToSpec ignores fold nodes, no-nesting reject.
  - **[~¼ est / ~⅛ actual, done]** ✅ Right-click on a selected non-fold node folds the selection (≥2 members, fold position = member centroid); double-click on a placeholder toggles collapsed; placeholder drags persist back to `viewerState.folds[].position` via `onNodeDragStop`. All save paths use `scheduleViewSave` only, so topogen never re-runs on a fold gesture.
  - **[~¼ est / ~0 actual, done]** ✅ Folds are purely visual. `topogen` ignores `topology.view.json`; the flat `Wiring/` package is byte-identical before and after a fold operation. No topogen change. Revisit only if code-gen organization wants matching structure (separate cap-hit, spec-side move).
  - **[~⅛, done]** ✅ Tier 3 invariant test: fold gestures (create/toggle/delete) post only `view-save`, never `save` ([e2e/fold-no-spec-save.spec.ts](../../tools/topology-vscode/e2e/fold-no-spec-save.spec.ts)). Selection pre-set via `__wirefold_view_fixture`; spec asserted byte-identical pre/post; getSent() filtered for `save` messages must be empty. Promotes "folds are purely visual" from plan-doc note to enforced runtime contract — exactly the silent-corrosion failure mode the broader testing strategy was added to guard against.
  - **[~⅛, done]** ✅ Tier 2 system-shape test: fold + delete (already covered). [test/delete.test.ts:69-75](../../tools/topology-vscode/test/delete.test.ts#L69-L75) asserts that `applyDelete` scrubs `fold.memberIds` when a member node is deleted. The unit-level coverage was already in place from Phase 3's delete retro; no new test needed.
  - **[~½]** ⏳ Nested folding (follow-up). Today [fold-core.ts](../../tools/topology-vscode/src/webview/fold-core.ts) rejects creating a fold whose members are already in another fold, and [adapter.ts](../../tools/topology-vscode/src/webview/rf/adapter.ts) takes "first wins" when a node appears in multiple folds. Lifting that needs: (1) a containment relation on `viewerState.folds` (parent fold id, or derived from membership inclusion); (2) edge re-routing that walks up the chain to the nearest *collapsed* ancestor on each side rather than checking only direct membership; (3) expanded-bounds that recurse so an outer expanded fold sizes itself around inner folds (collapsed placeholders + expanded child frames), not just leaf members; (4) delete that frees inner members back to the outer fold rather than to the top level. Tier 2 retro grid grows by the collapse/expand combinations across the tree. Pick up when a real topology hits a level-of-nesting wall — until then, single-level folds carry the recall affordance.

- **Phase 4.5 — plugin hardening (audit-driven)** **[~3.75 total across 5 sub-phases]** ⏳ Sourced from a full code-quality audit of `tools/topology-vscode/`. Five priority bands; do them in order — the bands are not interchangeable. Phase 4.5.1 is the "stop destroying user work" tier and gates everything else. Phase 4.5.5 is the test coverage that prevents the same bugs from re-shipping.
  - **Phase 4.5.1 — data-loss bugs ✅ [~¾ est / ~¼ actual]**
    - **[~¼ est / ~⅛ actual, done]** ✅ **C1.** Sidecar writes routed through `openTextDocument` + `WorkspaceEdit` + `doc.save()` so an open editor on the sidecar isn't clobbered (falls back to `fs.writeFile` when the file doesn't yet exist). Host posts `{type:"flush"}` to the webview on `panel.onDidChangeViewState(visible=false)`; webview's main message router calls `flushSave()`+`flushViewSave()` synchronously. `panel.onDidDispose` already disposes the now-tracked `viewStateSub`. ([src/sidecar.ts](../../tools/topology-vscode/src/sidecar.ts), [src/extension.ts](../../tools/topology-vscode/src/extension.ts), [src/webview/main.tsx](../../tools/topology-vscode/src/webview/main.tsx))
    - **[~⅛, done]** ✅ **C2.** Deleted the local `viewSaveTimer` / `lastSyncedView` / `flushViewSave` / `scheduleViewSave` in [app.tsx](../../tools/topology-vscode/src/webview/rf/app.tsx); all callers now use the shared module-level debouncer in [save.ts](../../tools/topology-vscode/src/webview/save.ts). `markViewSynced(text)` re-syncs the watermark on `view-load`. Pan-then-bookmark inside the 400ms window now coalesces correctly.
    - **[~⅛, done]** ✅ **H3.** `save` and `view-save` host handlers wrapped in try/catch; rejection posts `{type:"save-error", message}` back to the webview. (UI surfacing of the error is left as a follow-up — the rejection no longer silently corrupts state.)
    - **[~⅛, done]** ✅ **C3.** Replaced text-equality suppression with `document.version` tracking. Watermark bumped synchronously to `version + 1` *before* `applyEdit` so the change event (which fires before `applyEdit`'s promise resolves) is filtered; resynced post-edit. No-op resaves and identical-text resaves no longer leak through.
    - **[~⅛, done]** ✅ **H9.** `onNodeDragStop` non-fold branch mutates `spec.nodes[i].x/y` and calls `scheduleSave()`. Positions now survive disk reload. Manually verified.
  - **Phase 4.5.2 — correctness & protocol [~¾]**
    - **[~¼]** ⏳ **H4.** Webview↔host messages are read with no schema validation; could write `[object Object]` to disk. Define a discriminated-union `WebviewToHostMsg` / `HostToWebviewMsg` shared by both sides; type-narrow before use; reject unknown types. ([src/extension.ts:70-91](../../tools/topology-vscode/src/extension.ts#L70-L91), [src/webview/main.tsx:29](../../tools/topology-vscode/src/webview/main.tsx#L29))
    - **[~⅛]** ⏳ **H5.** `parseViewerState` returns `v as ViewerState` with no shape validation — hand-edited sidecars crash consumers. Mirror `parseSpec`'s validation discipline; on failure, log + return defaults. ([src/webview/viewerState.ts:36-44](../../tools/topology-vscode/src/webview/viewerState.ts#L36-L44))
    - **[~⅛]** ⏳ **H8.** Camera persists both legacy `{x,y,w,h}` viewBox (zeroed) and `zoom`; the viewBox-fallback path divides by zero in [camera.ts:15](../../tools/topology-vscode/src/webview/camera.ts#L15) for sidecars without `zoom`. Pick one representation; migrate older sidecars on load. ([src/webview/rf/app.tsx:196-199](../../tools/topology-vscode/src/webview/rf/app.tsx#L196-L199))
    - **[~⅛]** ⏳ **H7.** `lastSelectionIds` re-application across `load`/`view-load` arrival order leaves stale selection. Always reconcile selection on `view-load` (drop selected when not in saved set), or wait for both messages before initial render. ([src/webview/rf/app.tsx:117-124](../../tools/topology-vscode/src/webview/rf/app.tsx#L117-L124))
    - **[~⅛]** ⏳ **M9.** Mixed delete (fold + node) skips `rebuildFlow`; stale visuals persist until host round-trip. Make `handleDelete` call `rebuildFlow()` after mutating spec. ([src/webview/rf/app.tsx:241-261](../../tools/topology-vscode/src/webview/rf/app.tsx#L241-L261))
  - **Phase 4.5.3 — reach & packaging [~½]** *(do before any install/publish)*
    - **[~⅛]** ⏳ **H6.** Custom-editor `filenamePattern: "topology.json"` matches only literal name; `my-topology.json` won't open. Broaden to `**/*topology.json`. ([package.json:18-22](../../tools/topology-vscode/package.json#L18-L22))
    - **[~⅛]** ⏳ **H1.** `bundleWatcher` is `createFileSystemWatcher(absoluteString)`; `GlobPattern` only matches inside the workspace, so the watcher silently never fires for installed users. Wrap in `RelativePattern`, or gate on `context.extensionMode === Development`. ([src/extension.ts:55-56](../../tools/topology-vscode/src/extension.ts#L55-L56))
    - **[~⅛]** ⏳ **H2.** Watcher / topogen / runner / docSub leak on activation failure (only disposed via `panel.onDidDispose`). Push every disposable into `context.subscriptions`. ([src/extension.ts:56,65](../../tools/topology-vscode/src/extension.ts#L56))
    - **[~⅛]** ⏳ **M13.** `.vscodeignore` ships `test/**`, `e2e/**`, `*.config.*`, sourcemaps, `package-lock.json`, `playwright-report/`, `test-results/` in the VSIX. Add the missing exclusions. ([.vscodeignore](../../tools/topology-vscode/.vscodeignore))
  - **Phase 4.5.4 — runtime hygiene [~¾]**
    - **[~⅛]** ⏳ **M2.** `cp.exec` for topogen has a 1MB stdout cap — large diagnostics kill the run with ENOBUFS. Use `cp.spawn("go", ["run", "./cmd/topogen", "--check"])` and stream stderr (consistent with `runCommand.ts`). ([src/topogenRunner.ts:48](../../tools/topology-vscode/src/topogenRunner.ts#L48))
    - **[~⅛]** ⏳ **M3 / M4.** `kill("SIGTERM")` on `go run` leaves the inner binary orphaned on macOS; cancellation detection by signal name races against natural exits. Spawn with `detached: true`, kill the process group; track an explicit `cancelled` flag. ([src/runCommand.ts:29,50-53](../../tools/topology-vscode/src/runCommand.ts#L50-L53))
    - **[~⅛]** ⏳ **M7 / M8.** `retainContextWhenHidden: true` plus an unconditional RAF loop plus per-node WAAPI animations drains battery on hidden tabs; `notify()` allocates a fresh array each frame. Pause RAF + animations on `document.visibilitychange`; reuse the array. ([src/extension.ts:13](../../tools/topology-vscode/src/extension.ts#L13), [src/webview/playback.ts:111-118](../../tools/topology-vscode/src/webview/playback.ts#L111-L118))
    - **[~⅛]** ⏳ **M1.** CSP `style-src ${webview.cspSource}` may block any `<style>` element React Flow injects (inline `style=` attributes are fine without `'unsafe-inline'`; injected `<style>` is not). Verify in webview devtools; add `'unsafe-inline'` if RF requires. ([src/extension.ts:106-108](../../tools/topology-vscode/src/extension.ts#L106-L108))
    - **[~⅛]** ⏳ **M10.** Module-level `let spec` mutated in place defeats any future `useEffect([spec])`. Treat spec as immutable; produce new objects on edit. ([src/webview/state.ts:6](../../tools/topology-vscode/src/webview/state.ts#L6))
    - **[~⅛]** ⏳ **M6 / M12.** Audit `path` reconstruction in `sidecar.ts` for Windows (`Uri.joinPath` instead of string concat); confirm webview loads `.map` files for production stack traces. ([src/sidecar.ts:5-8](../../tools/topology-vscode/src/sidecar.ts#L5-L8), [esbuild.mjs:10](../../tools/topology-vscode/esbuild.mjs#L10))
  - **Phase 4.5.5 — test coverage to lock the audit findings [~1]**
    - **[~½]** ⏳ Extension-host integration tests via `@vscode/test-electron`: sidecar I/O, message protocol round-trip, debounce flush-on-dispose, applyEdit version-suppression. The audit's Critical and High items are concentrated in host code that has zero test coverage today; this is the load-bearing addition.
    - **[~⅛]** ⏳ `parseSpec` rejection-path tests (every reject branch in [src/schema.ts](../../tools/topology-vscode/src/schema.ts)).
    - **[~⅛]** ⏳ `parseViewerState` validation tests (will fail until H5 lands; that's the point).
    - **[~⅛]** ⏳ `onConnect` port-taken rejection test ([app.tsx:279-287](../../tools/topology-vscode/src/webview/rf/app.tsx#L279-L287)) — load-bearing invariant for codegen.
    - **[~⅛]** ⏳ Camera-without-`zoom` regression test (would catch H8).
    - **[~⅛]** ⏳ Node-drag persistence e2e test (will fail until H9 lands).
    - **[~⅛]** ⏳ Add CSP meta to `e2e/harness.html` so prod-CSP bugs surface in Playwright instead of leaking past until install. ([e2e/harness.html](../../tools/topology-vscode/e2e/harness.html))
  - **Phase 4.5.6 — lows & nits [opportunistic]** Pick up while touching adjacent code; not a planned cap-hit. Includes: legacy SVG viewport restore size-dependence (L1), `EDGE_KIND_OPTIONS` duplication of `EDGE_KINDS` (L2), unused `view` import (L3), URL-safe nonce (L4), `flowToSpec` always-`"any"` debt (L5 — overlaps Phase 9), test-only `__wirefold_test` shipped in production (L7), empty-`contentChanges` filter (L8), dead `panStartListeners` (L9), `parseDur` NaN check on the `ms` branch (L10), toolbar HTML hand-built in host then bound by webview JS, `topogen` errors via `showErrorMessage` per save instead of OutputChannel, `package.json` missing `categories`/`repository`/`icon`/`engines.node`, tsconfig strictness (`noUncheckedIndexedAccess` etc.), no ESLint config. Also: saved-view click UX — currently captures + restores the camera at save time; tried `fitView` on `nodeIds` (no captured camera) but tuning was finicky (zoom too strong even with `padding: 0.4, maxZoom: 1.2`). Reverted to camera-capture; the `fitNodes` bridge entry + optional `viewport?` field on `SavedView` are left in place to make the next attempt cheap. `viewport` made optional on `SavedView` schema for forward-compat.

- **Phase 5 — comparison** **[~1.5 + ~⅜ tests]**

  *Open questions resolved:*

  1. **Source / surfacing of "the other spec." Unified single-canvas
     view, not split-pane.** Two interaction modes, both layered on
     the existing live editor (no second RF instance). Loading: a
     "Compare with HEAD" button (one-click default; host-side handler
     shells `git show HEAD:<relpath>` and posts the parsed spec back
     to the webview) and "Compare with file…" (host-side picker). The
     webview holds the comparison spec in memory; the live spec
     remains the only thing wired to topogen / save.

     - **Mode A — Toggle + persistent diff halos.** Canvas shows one
       spec at a time; an A/B toggle flips which is rendered.
       Playback runs on whichever side you're viewing (single timing
       array, no ambiguity). Items unique to the currently-shown side
       get a dashed colored halo (e.g. green halo on B-only nodes
       when viewing B); moved nodes show a faint ghost outline at
       their other-side position with a thin connector; retimed
       nodes get a small clock badge in the corner; rewired edges
       render dashed. Halos use stroke style + opacity, not fills,
       so playback flashes stay uncontaminated.
     - **Mode B — Onion-skin / ghost overlay.** Live spec renders
       solid; HEAD/other renders as a translucent layer underneath
       (~25% opacity). Agreement is invisible (ghost hidden under
       solid); disagreement appears as translucent shapes peeking
       out (HEAD-only nodes look faded; live-only nodes look crisp
       with no ghost behind). Playback animates the live layer; the
       ghost stays static. A held-key (spacebar) momentarily swaps
       layer ordering to foreground the ghost.

     Mode A is the default; Mode B is a toggle in the comparison
     toolbar (and the spacebar shortcut while in B). Nested folding
     keeps the on-screen node count small enough that ghost overlay
     doesn't get crowded; if a future case stresses it, fall back to
     Mode A only inside that subgraph.

     *Rejected:* split-pane two-RF-instances (two cameras to manage,
     coupling decisions); diff-only skeleton (loses playback context);
     crossfade slider (animation-tool-y, not how this tool reads);
     membership ribbons on a union view (would crowd the canvas
     without nested folding — kept on the table only conditionally).

     *Subsumed:* the original "two RF instances vs. one canvas" and
     "camera sync mode" sub-questions are decided by the unified-view
     choice — one RF canvas, one camera. Mode B's ghost shapes are
     injected as additional RF nodes with a `.ghost` className so
     they ride RF's coordinate transform for free (no hand-rolled
     SVG overlay).

  2. **Diff representation. Pure module.** New file
     [tools/topology-vscode/src/webview/diff-core.ts] exporting
     `diffSpecs(a: Spec, b: Spec) → SpecDiff` with output shape
     `{ nodes: { added, removed, moved }, edges: { added,
     removed, rewired } }` (each a `string[]` of ids). The
     renderer reads the diff and decorates RF nodes/edges via
     className. Kept *outside* the spec↔flow adapter — diff is a
     spec↔spec concern, adapter stays purely render. Tier 2 contract
     test (already in the per-phase test list) covers no-mutation,
     determinism, and add/remove symmetry under arg swap.

     *Rejected:* folding diff into the adapter (mixes two
     responsibilities, makes the round-trip test harder to keep
     honest); per-component lazy diff lookup (over-engineered — spec
     is small, whole-graph diff is microseconds at the 250ms save
     cadence).

  3. **Visual highlight vocabulary. Four categories; mix channels;
     compose with `.dim`.** Diff categories get distinct visual
     treatment, using a mix of channels so no one channel gets
     overloaded:
     - **Halo color** for membership-difference: `.diff-added` =
       green halo (stroke ring), `.diff-removed` = red halo.
     - **Stroke style** for shape/wire change: `.diff-moved` =
       amber dashed outline (node), `.diff-rewired` = amber dashed
       edge stroke.

     `.diff-retimed` is *dropped*: `timing.steps[]` is on its way
     out as a stored spec field (see Phase 5.5 — Animation model
     rewrite), so a "retimed" category would be defining a diff
     against a field that won't exist. If a future per-node
     `props`/config formalism lands, a `.diff-reconfigured`
     category (gear badge) would slot in to surface those changes;
     don't pre-bake it.

     **Diff staleness during edits:** the diff recomputes alongside
     the existing 250ms save debounce — same cadence as topogen. Rule:
     *what's saved is what's diffed*. Highlights lag the edit by
     ≤ 250ms, well under the threshold where it would feel stale, and
     mid-rename keystrokes don't trigger flicker. Live pane stays
     editable while comparison is open (rejected option (d) — cuts off
     the "edit and see the diff update" workflow that's the whole point).

     **Position threshold for `.diff-moved`:** L¹ dead-band,
     `|Δx| + |Δy| > 1px` in spec coordinates counts as moved. Sub-pixel
     drift from formatter / hand-edit differences is suppressed; any
     intentional layout adjustment ≥ 1px still flags. Threshold lives
     as `POSITION_EPSILON = 1` in `diff-core.ts`. Tier 2 contract test
     includes a "drift below threshold isn't reported" case.

     Halos / dashed strokes all live on the *outside* of
     the node body, leaving fills free for playback flashes.
     Composition with the existing `.dim` saved-view class:
     **diff highlights punch through dim** — the node stays at ~18%
     body opacity but its halo renders at full opacity, so a
     change in a non-active view is still glanceable. Tier 3
     saved-view+diff test enforces this rule. Final tuning of
     palette/sizes is left to in-editor iteration once visuals
     land — taste calls easier to make against real diffs than in
     the abstract.

  - **[~½]** Side-by-side mode loading two specs (current vs. git HEAD, or two files).
  - **[~½]** Computed diff: added / removed / moved / rewired. (Mechanical. `retimed` dropped — see Phase 5.5.)
  - **[~½]** Visual highlight (color tint, badges) for diff items. (Two-pane camera sync UX is the variable part.)
  - **[~⅛]** Tier 2 contract test: `diffSpecs(a, b)` is a pure function — no spec mutation, deterministic output, symmetric where appropriate (added vs. removed swap when args swap). Each diff category gets a fixture pair. Locks down the diff before the renderer-side decoration adds noise.
  - **[~⅛]** Tier 2 invariant test: only the *live* pane talks to topogen. Spy on `vscode.postMessage`, mutate the comparison pane's nodes, assert no `{type: "save"}` fires from that pane. Catches the bug where the comparison pane accidentally re-runs codegen against a HEAD spec.
  - **[~⅛]** Tier 3 system-shape test: fold + diff. Load two specs that differ inside a folded region; verify diff highlighting surfaces on the placeholder when collapsed (badge with category counts) and on the underlying members when expanded. Documents the rule: diff state composes with fold state, neither swallows the other.
  - **[~⅛]** Tier 3 system-shape test: saved-view + diff. With a saved view active, the dim/active className must compose with the diff classNames without one overriding the other. Concrete failure shape: `.dim` and `.diff-added` both set on a node — both styles must be visible (e.g., dimmed-but-tinted), or one must explicitly win per a documented rule.

- **Phase 5.5 — animation model rewrite (simulator + per-node tickers)** **[~2 cap est, ⏳]** Replaces the current `timing.steps[]`-driven master playback clock — an SVG-era artifact whose position/timing coupling forced a script recompute on every layout edit and was a major past cap-hit sink. Also clarifies how Phases 6 and 7 land. Must ship before Phase 6 (keyframed motion) starts.

  *Goal:* animation behavior emerges from the topology + per-node response rules, the way it does in the running Go system. Spec edits never touch a global script. Position is independent of timing.

  *Components:*
  - **Per-node response rules (props/handlers).** Each node-type registry entry declares a per-input handler ("when a pulse arrives on `in`, fire and emit on `out` after delay D"). Per-instance config (`AndGate.inputCount`, `Latch.delay`) lives on `spec.nodes[i].props`. Response rules + props are the only authority for what fires when. `timing.steps[]` is removed from the spec or kept only as an *initial seed* (a small list of `(port, t0, value)` tuples that kick off the simulation).
  - **Simulator.** Pure module that, given (spec, optional seed, current world-state), advances the simulation by one event: pop one ready input, run the receiver's handler, emit pulses on outputs into in-flight queues. Deterministic given a tie-break rule (e.g., FIFO by event-arrival id). Independent of the renderer.
  - **N1' — concurrency reveal mode (auto-detected concurrent edges).** Edges flagged "concurrent" run a self-pacing pulse loop: pulse N+1 leaves the source when pulse N arrives at the target. Rate emerges from edge traversal time, so faster edges visibly cycle faster — surfaces *which parts of the graph run in parallel and how their natural rhythms relate*. Concurrent edges are detected automatically by analyzing the per-node handlers + edge graph: an edge is concurrent if its source's firing isn't gated by another edge that's gated upstream (no AND/sync ancestor). This needs the per-node handler formalism to land first; manual override flag (`edge.concurrent: true`) is the fallback if auto-detection turns out unreliable in practice.
  - **N2 — step-debugger.** Per-node play / pause / step. Step = process one input pulse (fire + emit). Play = step on a wall-clock interval (e.g. 200ms). Pulses-in-flight pause when their source pauses. Multiple nodes can play concurrently. Visualized as per-node pause/play affordances in the corner of each `AnimatedNode`.

  *What gets gutted from the existing system:*
  - **Master playback clock** (`playback.ts`) — removed. Per-node tickers replace it.
  - **Global timeline scrubber** — removed (no global `t` to scrub).
  - **Bookmarks-at-t** — replaced with **resumption-coordinate bookmarks**. Each bookmark is `{name, startNodeId, cycle}` (one node per bookmark; multi-node ignition is "activate two bookmarks at once" via shift-click, not a list field on a single bookmark). Clicking a bookmark fast-forwards the simulator to `cycle = Y` with `startNodeId` as the active node, then hands off to N2 (play / pause / step from there). Cycle definition: **anchor-fire (ii-b)** — `spec.cycleAnchor: nodeId` declares one node as the cycle counter; cycle increments each time the anchor fires. Default if `cycleAnchor` is unset: **(ii-a) quiescent-input** — cycle increments each time the simulator drains one input value and returns to a no-in-flight state. Fast-forward strategy: **F1 deterministic replay** (simulator re-runs cycle 0 → Y silently, then UI takes over). No snapshot storage. F2 (memoized snapshots every N cycles) only added if F1 turns out slow in practice for real topology sizes.
  - **`timing.steps[]` in the spec** — removed (or reduced to seed-only).

  *What survives unchanged:*
  - Per-node flash + state-text animations — become one-shot, event-triggered (fire-on-handler-fire) instead of clock-subscribed.
  - Edge pulse traversal — one-shot per pulse event. Concurrent edges are just continuous re-triggers of the same primitive.
  - `▶ run` / build pipeline.
  - Spec/viewer split, sidecar, codegen pipeline, fold/saved-view machinery.

  *Dependencies created:*
  - **Phase 6 (keyframed motion):** rebudget after this lands. *Real* node motion (a partition node sliding) becomes a node-prop the simulator reads; pure-presentation animation lives on viewer state. Probably *cheaper* than current ~2.5 estimate because the spec/viewer split for keyframes becomes mechanical.
  - **Phase 7 (trace replay):** clarifies materially. A trace from the running Go is structurally `(node, event-type, value, ordinal)` tuples — directly comparable against simulator output. "Drift" is well-defined.
  - **`.diff-reconfigured`** for Phase 5: only meaningful once `props` exist. Add to Phase 5 vocabulary as a follow-up after this phase ships.

  *Risk:* the per-node handler formalism is the load-bearing piece. If handlers aren't expressive enough, real Go behaviors won't be reproducible in the simulator and N1' / N2 give a false picture. Seed handler set should cover the existing `NODE_TYPES` registry; expand only as new node-types are added. Keep handlers as small, pure `(state, input) → (state', emissions)` functions — same shape Redux reducers / React `useReducer` use, same property: easy to test in isolation.

  *Estimate breakdown:* response-rule formalism + seed handlers (~½), simulator core + tie-break + tests (~½), N2 per-node UI controls + event-triggered animation rewrite (~½), N1' auto-detection + self-pacing edge loop (~½). Total ~2 caps; risk to ~3 if auto-detection turns flaky and we have to fall back to manual flags + UX for setting them.

- **Phase 6 — keyframed motion (when a topology actually rewires during its cycle)** **[~2.5, risk to ~4; +~⅜ tests; rebudget after Phase 5.5]**
  - **[~⅛]** ⏳ Tier 1 round-trip coverage extended to `positionKeyframes` / `endpointKeyframes` / `visibility` *before* any UI lands (each new spec field becomes a fixture row; the bridge can't silently drop them).
  - **[~¼]** Schema: `positionKeyframes`, `endpointKeyframes`, `visibility`.
  - **[~¾]** Renderer tweens between keyframes during playback.
  - **[~½]** Decide whether `topogen` reads keyframes (yes if the runtime causes the change; no if it's pure presentation). Spec-vs-viewer judgment per keyframe kind is the risk multiplier.
  - **[~1]** Record-mode editor: drag at non-zero playhead → new keyframe.
  - **[~⅛]** ⏳ Tier 2 invariant test: viewer-kind keyframes never reach topogen input; spec-kind keyframes always do. Run topogen against a spec containing both, assert generated Go references the spec keyframes and ignores the viewer ones. Promotes the spec-vs-viewer keyframe judgment from per-case decision to enforced contract.
  - **[~⅛]** ⏳ Tier 3 system-shape test: keyframe + playback + bookmark. At a non-zero bookmark, paused playback must show the interpolated position for keyframed nodes; resuming must continue from that interpolation, not jump to t=0. Catches the master-clock-vs-keyframe-cursor desync bug that's the obvious failure mode of mixing clocks.
  - **[~⅛]** ⏳ Tier 3 system-shape test: keyframe + record-mode + saved-view. Recording a new keyframe inside a saved view must not affect non-member nodes' keyframes. Locks down the rule that record-mode is scoped to whatever's interactive at the playhead, not the whole spec.

- **Phase 7 — trace replay rejoins the pipeline** **[several, see [trace-replay-plan.md](trace-replay-plan.md); +~¼ tests]**
  - **[~2–3]** Implement value-flow tracing in the generated Go (per [trace-replay-plan.md](trace-replay-plan.md)). (Dominates; Go edits are token-light.)
  - **[~1]** Editor loads or streams traces; replays observed behavior on the same diagram.
  - **[~1]** Side-by-side: intended animation (from spec) vs. observed animation (from trace). Drift becomes visible.
  - **[~⅛]** ⏳ Tier 2 invariant test: trace replay never mutates the spec. Load a spec, replay a trace against it, assert `JSON.stringify(spec)` is byte-identical before/after. Promotes the rule "trace is observation, spec is design" from doc to test.
  - **[~⅛]** ⏳ Tier 3 system-shape test: trace + spec animation in side-by-side. Both panes' master clocks must stay independent (scrubbing one doesn't move the other) but bookmarks must be jumpable from either pane. Catches the obvious failure mode where the side-by-side coupling collapses one clock onto the other.

- **Phase 8 — polish** **[open-ended, ~⅜ saved by React Flow + the AnimatedNode pattern; +~⅜ tests]**
  - **[~⅛]** Spec undo / redo. (Cheaper than the original ~¼: the "mutate spec → rebuild via `specToFlow` → `setNodes`/`setEdges`" pipeline is already proven by id rename's `rerender` callback; an undo stack of spec snapshots plugs into the same callback.) **Substrate:** use [`zundo`](https://github.com/charkour/zundo), the dominant Zustand undo middleware (~2KB, snapshot-based with built-in grouping/diffing). Wraps the spec store in one line; avoids hand-rolling and maintaining a stack.
  - **[~⅛]** Deliberate-viewer undo / redo: folds, saved views, bookmarks. *Not* camera, lastSelectionIds, current playhead, or active-view selection — those are incidental tracking, not deliberate creations, and undoing them is jarring (cf. word processors not undoing scroll position). Same `zundo` substrate, **separate undo stack** so spec and viewer histories are independent: pressing undo with focus in the main pane rolls back spec changes; pressing it with focus in a viewer panel (folds list, saved-views, bookmarks) rolls back that panel's creations. Avoids the surprising case where pressing undo after deleting a saved view also rolls back an unrelated spec edit.
  - **[~⅛]** Visual rollback affordance for both undo stacks. After an undo, briefly highlight the affected node/edge/fold/view/bookmark using the diff classNames from Phase 5 (`.diff-added` for re-appearing, `.diff-removed` for un-appearing) plus an optional camera pan to frame the change. Reuses Phase 5's vocabulary — same visual idea, different trigger. Without this, undo is "did something happen?"; with it, undo is "I see exactly what happened." Tier 4 nightly should screenshot a few frames mid-affordance to catch regressions in the highlight timing.
  - **[~⅛]** Snap-to-grid; alignment guides. (React Flow has snap-to-grid built in; alignment guides are custom but cheap. Trimmed from ~¼ after the Phase 4 calibration — same shape: library primitive + thin custom layer + no spec touch.)
  - **[~⅛]** ⏳ Tier 3 system-shape test: spec undo + fold + delete. Apply a sequence (delete a node, fold a selection, rename, re-fold), step the *spec* undo back across the sequence, assert spec returns to its initial bytes; the viewer-state folds stack should be untouched (deleted folds reappear only when the *viewer* undo is exercised). Catches the bug where the two stacks bleed into each other or where a spec rollback leaves a fold pointing at a now-restored node id incoherently.
  - **[~⅛]** ⏳ Tier 2 invariant test: each undo stack is scoped to its own surface. After a spec undo, viewer-state diffs (folds, views, bookmarks, camera, lastSelectionIds) must be byte-identical to pre-undo. After a viewer undo, the spec must be byte-identical to pre-undo. Stronger than the previous "undo only touches spec" rule — has to police *two* surfaces' independence, not one. Promotes the rule from comment to enforced contract.
  - **[~½]** ⏳ Tier 4 headline edit-to-running-Go test. Success criterion #1 ("under 30 seconds end-to-end") made executable: scripted gesture + topogen + `go build`, latency measured. Nightly, not per-commit. Catches latency regressions (topogen slowdowns, debounce drift) that no other tier sees.
  - *Dropped: SVG export.* The `diagrams/` set is hand-authored to the style guide and the editor itself is the live view — exporting would mean re-implementing the style guide twice (live + export). Revive only when hand-authored diagrams drift from the spec badly enough to hurt; until then, screenshots / recordings cover incidental sharing.

- **Phase 9 — diagram parity with the reference SVGs** **[~1.5 + ~½ visual baselines = ~2]** ⏳ Bring the editor's rendering up to the visual fidelity of `diagrams/topology-chain-cascade.svg` and the rest of the hand-authored set, so the editor and the documentation diagrams agree at a glance. The spec already carries the inputs (`edge.route: line | snake | below`, `edge.lane`, `arrowStyle`, `legend`, `notes`, named ports); the current adapter ignores most of them. Scope: custom RF edge components per `route` kind (orthogonal snake-paths, under/above lanes for `feedback-ack` / `inhibit-in`); per-port `Handle` rendering on nodes (also unblocks Phase 3's port-drag gesture); the house style from [docs/svg-style-guide.md](../svg-style-guide.md) (dashed strokes by kind, marker-end variants, value labels along edges, legend block); custom node bodies for shapes the SVG distinguishes (pill vs rect, internal sub-rows); render `spec.notes[]` as floating annotation boxes in the canvas (the cascade SVG's `behavior-note-*` blocks — spec already carries them, adapter currently drops them). Excluded: choreography beyond `fires` / `departs` / `arrives` (would require extending the spec — out of scope for parity); top-level diagram title / framing background (no spec field today; defer until a `title` field is needed).
  - **[~½]** ⏳ Tier 4 visual regression: screenshot diffs at fixed cameras, one per `route` kind. Tolerance thresholds + pinned CI image to control flake (font rendering, anti-aliasing). Turns "matches the reference SVGs" from a per-change judgment call into pass/fail.

**Status snapshot (this branch):** Phases 1 and 2 complete. Phase 3
underway: React Flow substrate migration complete (commits `70356ea`
+ `e449fcc`) — camera persistence, saved-views frame + dim, edge
pulses, node id rename, per-node flash + state-text, flush
edge-to-node anchoring, and width-grows-to-fit-id all re-ported and
visually verified. The editing gestures (selection persistence to
spec, delete-to-remove, port-drag wiring with channel-type inference,
node palette, sublabel/note editing) still pending. Phases 4–8 not
started. The visual → spec → Go pipeline runs on every save with a
status indicator, and recall affordances (saved views, bookmarks +
playback control) are in place.

Phase 1 alone changes the tool from "live preview" to "design surface."
Phases 2–3 make it a durable design surface you can come back to and
extend without dropping into JSON. Phases 4–6 are recall + dynamics
power-tools. Phase 7 is the observed-vs-intended loop. Phase 8 is
comfort.

## What success looks like

Tests for whether the tool is doing its job. Most are about throughput,
not appearance.

1. **Edit-to-running-Go test.** A small structural change (add a node,
   wire an edge) reaches running Go in under 30 seconds end-to-end.
   This is the headline number.
2. **The five-second test.** Two weeks away from the project, you open
   the diagram and the topology snaps back into your head in five
   seconds. Layout stability + saved views deliver this.
3. **The change-and-recompare test.** A small change a day ago is
   immediately visible when you re-open. Comparison + diff-friendly
   spec persistence delivers this.
4. **The "show me just X" test.** One click frames a subsystem and
   dims context. Saved views deliver this.
5. **The "what happens at moment Y" test.** One click jumps to a named
   transition in the animation. Bookmarks deliver this.
6. **The decision-feels-like-sketching test.** Modifying the topology
   to match a new design idea feels like sketching, not data entry.
   Editing gestures deliver this.
7. **(Phase 7) The drift test.** Open a spec, run the generated Go,
   replay the trace next to the spec animation; any disagreement is
   visible. Trace replay delivers this.

## Testing strategy

Test work items are folded into the phases above (Phase 3
prerequisites + retros, Phase 6 keyframe round-trip, Phase 8 e2e,
Phase 9 visual). This section holds the cross-cutting strategy
that doesn't belong in any single phase.

**The pipeline shape drives the strategy.** `topology.json` in,
generated Go out — most regressions to date have been adapter /
codegen drift, not UI behavior. So: guard the contracts cheaply
and exhaustively (Tier 1, in Phase 3 prerequisites); add bridge
unit cases as the bridge grows (Tier 2, retros in Phase 3 +
extensions in Phase 6); test gestures only once they stop
changing weekly (Tier 3, end of Phase 3); reserve e2e and visual
for nightly (Tier 4, Phases 8 + 9).

**Bar for every test:** it must be able to fail for a real bug
we can name. Round-trip tests that re-encode the same
`JSON.parse` on both sides, golden tests whose `expected/` was
written by running the tool itself with no review, or assertions
like `expect(result).toBeDefined()` don't count. *If a test
would still pass after deleting the production code path it
covers, it's not a test.*

**Per-phase system-shape rule.** Each new feature must contribute
*one* Tier 3 case that exercises its interaction with an
existing feature, not just its standalone behavior. Standalone
gesture tests catch the obvious break; the expensive bugs are
the multi-mechanism ones (fold + diff, saved-view + camera-sync,
keyframe + playback) that no per-feature test would surface.
Each system-shape case is a thin wedge driven into the
combinatorial M×N space; the space shrinks measurably with each
one. Concrete cases listed under each phase below. The rule
exists because without it, the gap between "looks right" and
"is right" widens monotonically as phases stack.

**Promote invariants from notes to tests.** When a phase entry
says "X never happens" or "Y must never fire," that's a
candidate for a failing test. Plan-doc rules erode across cap
hits and AI sessions; tests don't. Each phase should explicitly
list which of its invariants are *enforceable* (have a test
that fails if the invariant is violated) and which are still
notes-to-self. Closing the gap between the two is part of
finishing the phase, not optional polish.

**Tier → Phase map and net savings:**

| Tier | Cost | Saved (Phases 3–6) | Net | Lives in |
|---|---|---|---|---|
| 1 — contract (round-trip + goldens) | ~1 | ~3–4 | **+2–3** | Phase 3 testing foundation |
| 2 — bridge units + invariant promotions | ~¾ (~½ original + ~¼ promotions across Phases 4–8) | ~1.5–2 | **+¾ to +1¼** | Phase 3 retros; per-phase invariant tests |
| 3 — gesture (Playwright) + system-shape | ~1⅛ (harness ~¼ done + 4 standalone cases ~½ + system-shape cases ~⅜ across Phases 4–8) | ~2–3 | **+1 to +1¾** | end of Phase 3 + per-phase additions |
| 4 — e2e + visual | ~1 | ~1.5 | **+½** | Phase 8 (e2e); Phase 9 (visual) |

Total saved across the plan: roughly **3–4.5 cap hits net**
against ~8 remaining for Phases 3–6. Beyond the cap-hit count,
contracts becoming enforced rather than remembered compounds in
ways the table doesn't capture — and the per-phase system-shape
cases compound *against* the M×N combinatorial-bug surface that
grows monotonically without them.

**Non-goals.** Unit tests on React Flow internals, coverage
percentage targets, testing topogen against hand-written Go
(goldens only), snapshot tests of arbitrary serialized output
(too easy to rubber-stamp on `-update`).

## Risk and effort

Effort is measured in **Opus 4.7 cap hits** — how many times the
session token budget is exhausted before the work is done. A
"session" here means "one cap exhaustion." Calibration anchor:
Phase 2 shipped in ≤2 cap hits.

What burns the cap: large file reads on each context rebuild,
back-and-forth UI iteration with extension reloads, and verification
runs through `topogen` that re-read generated Go. Pure planning /
small edits are cheap; gesture-by-gesture UI work and keyframe
animation work are expensive.

A round of repo cleanup landed before resuming Phase 3 (commits
`29413bd…3d5bade`): SVG conventions out of CLAUDE.md auto-load,
deleted the parallel `tools/topology-editor/` tree, split
`extension.ts` by concern, added `tools/topology-vscode/ARCHITECTURE.md`
as a one-screen file map, spec-summary header on generated
`Wiring/wiring.go`, and `topogen --check` so debounced saves validate
without rewriting the file. The estimates below already credit those
savings against the prior `~13` total.

- Phase 1: ~2 cap hits. **Done.** Codegen wiring + sidecar split.
- Phase 2: ≤2 cap hits. **Done** (actual). Saved views, bookmarks,
  build-and-run, master-clock timeline refactor.
- Phase 3: ~2.75 cap hits with React Flow migration (~2 migration —
  ~1.25 substrate + ~¾ tail, slightly over the ~½ tail estimate due
  to frame-mismatch debugging across the SVG↔RF transition — plus
  ~¼ Tier 3 harness already landed, plus ~½ for the four queued
  Tier 3 follow-ups), down from a previous ~3.25 estimate after the
  Tier 3 harness came in at ~¼ vs. the ~¾ reserve. The standalone-
  HTML harness option (a) eliminated the vscode-test-electron tail
  that the original budget reserved for. **Lesson:** when an
  estimate carries a fork between a cheap path and an expensive
  fallback, anchor the estimate on the cheap path *if* you can
  cheaply spike it first; only widen the budget if the cheap path
  fails. Here the cheap path won outright. Node id rename shipped in ~1 (pre-migration; re-ported during
  the substrate migration). Port-drag, selection, marquee, and
  edge-edit collapse to library calls; channel-type inference for
  codegen stays custom. **Lesson logged for Phases 4 and 6:** when
  migrating between rendering frames (SVG ↔ RF, keyframe-driven UI),
  budget extra for things that visually overlay a primitive — they
  must live in the same DOM frame and transform context as the
  primitive itself, or alignment / lifecycle / scale drift somewhere.
- Phase 4.5: ~3.75 cap hits (audit-driven plugin hardening). Five
  bands; 4.5.1 (~¾) is data-loss bugs and gates everything else,
  4.5.5 (~1) is the test coverage that prevents regression. Sourced
  from a full code-quality audit of `tools/topology-vscode/`. Worth
  running before Phase 5 because Phase 5's two-pane mode doubles the
  surface for every Critical / High item.
- Phase 4: ~⅜ cap hit actual (vs. ~1 estimate, vs. ~2 pre-RF).
  Underran because the slice was three composable pieces (adapter
  rerouting, FoldNode component, gesture wiring) sharing one
  surface; folds also turned out to be cheaper as a sibling RF node
  than as a `parentNode` parent (no relative-coordinate translation,
  no member-position migration). **Lesson:** when a slice is "library
  primitive + sidecar bookkeeping + one or two simple gestures" and
  the spec stays untouched, the budget can compress to ~⅜–½. Apply
  this to similar-shape future items (Phase 8 snap-to-grid, Phase 8
  undo) cautiously; do *not* extrapolate to keyframes (Phase 6) or
  custom-edge work (Phase 9), which don't share the shape.
  Nested folds still need manual coordination.
- Phase 5: ~1.5 cap hits. Diff is mechanical. Two-pane camera sync +
  highlight UX is the variable part.
- Phase 6: ~2.5 cap hits, risk to ~4. Keyframe interpolation +
  record-mode editor. The spec-vs-viewer judgment per keyframe
  kind plus any `topogen` keyframe-reading is what blows it out.
- Phase 7: as scoped in [trace-replay-plan.md](trace-replay-plan.md);
  several cap hits, dominated by Go-side tracing instrumentation
  (cheaper per cap hit than UI work — Go edits are token-light).
- Phase 8: open-ended; React Flow's built-in undo pattern + snap-to-grid
  *and* the proven "mutate spec → `specToFlow` rebuild → `setNodes`/
  `setEdges`" pipeline (used by id rename's `rerender` callback) trim
  another ~⅛ off the spec-undo line — ~⅜ saved total vs. fully custom.
  Undo split into three: spec undo (~⅛), deliberate-viewer undo with a
  separate stack (~⅛), and a visual rollback affordance reusing Phase
  5's diff classNames (~⅛). The split costs ~¼ more than the original
  single-line undo entry but resolves the "does undoing a saved-view
  delete also undo my last spec edit?" surprise that a single shared
  stack would create. Worth doing right since the undo stack's shape
  is structural — painful to retrofit later.

Phases 3–6 remaining (excluding Phase 4.5): **~5.25 cap hits**
(Phase 3 ~½ + Phase 5 ~1.5 + Phase 6 ~2.5, +0.5 for sublabel/undo
savings already booked, −¾ from the Tier 3 harness underrun,
−⅝ from the Phase 4 underrun). **+~3.75 for Phase 4.5** brings
the band to **~9 cap hits** through Phase 6 inclusive of audit
hardening. Phase 4 itself is now done at ~⅜ actual. Headline
pipeline through Phase 3: **~½ more cap hits** from where this
branch sits (substrate + migration tail done, Tier 3 harness done;
remaining is the four Tier 3 follow-up cases). Phases 4 and 8 stay
materially cheaper than the pre-RF estimates; Phase 4 came in
cheaper still than its post-RF estimate.

The biggest risks:

- **Letting authoring polish creep up the priority list.** Authoring
  features feel visible; codegen integration and recall affordances
  carry more weight per hour invested.
- **Spec/viewer split done late.** If viewer fields leak into the spec,
  pulling them out later is painful (every existing spec file needs
  migration). Do the split in Phase 1.
- **Codegen falling behind.** If editing the diagram and updating
  `topogen` ever drift, the tool stops being a design surface and
  becomes documentation again. Treat `topogen` capability gaps as
  Phase 1 blockers, not as future work.

## What the AI does in this loop

The tool's value is *yours* — the topology you design and the system
that emerges from it. The AI's contribution is two-sided:

- **Inside the tool's construction:** picking implementation pieces
  (lit-html, WAAPI, `topogen` strategy), translating between your
  conceptual model and the rendering / persistence / codegen layers,
  maintaining boring invariants so they don't bleed time.
- **Inside the design loop the tool enables:** once the pipeline is
  smooth, the AI participates as a collaborator on topology design —
  you propose a structural change verbally or by sketching, the AI
  reasons about consequences, the editor makes the change concrete,
  `topogen` produces the code, you run it and see. The AI is no longer
  asked to edit SVG XML by hand; it's asked to reason about circuits.

What the AI doesn't do: decide what the topology means, or which design
direction is interesting, or what the system is *for*. Those stay with
you. The pipeline lowers tool-syntax fatigue so more of the time spent
goes to the part nobody can outsource.
