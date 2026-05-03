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

Cap-hit estimates in **[brackets]** at each phase and item. See [Risk and effort](#risk-and-effort) for the methodology. Phases 3, 4, and 8 estimates assume the React Flow substrate above.

- **Phase 1 — pipeline foundations ✅** **[~2, done; React-Flow-affected items re-ported during Phase 3 migration]**
  - **[~1]** Tighten codegen integration: structured `topogen` invocation on debounced save (250ms, queued, no overlap); status indicator (green / amber / red). *Inline error surfacing on the offending node/edge deferred — topogen errors are bare strings, would need a structured error format to attach to specific node IDs.* **Renderer-independent — survives React Flow migration unchanged.**
  - **[~½]** Spec/viewer split: `topology.view.json` sidecar with `camera`, `views`, `folds`, `bookmarks`, `lastSelectionIds`. No migration needed — `topology.json` had no viewer fields. **Renderer-independent — survives unchanged. React Flow's `folds` representation will use its subflow primitive, but the sidecar schema is the same.**
  - **[~½]** Lock down stable-layout invariants: pan/zoom debounced-saves to sidecar; camera restored on load; node positions never auto-shift. **Re-port required: wire React Flow's `onMove` / `onNodeDragStop` to the existing sidecar persistence. Folded into the Phase 3 migration estimate.**

- **Phase 2 — recall affordances ✅** **[≤2, done; React-Flow-affected items re-ported during Phase 3 migration]**
  - **[~½]** Saved views: top-right panel, "+ save current" with inline name input, click-to-frame, non-member dim, pan/zoom clears the dim. Membership is bounding-box overlap with current viewport. **Re-port required: replace direct SVG bbox math with React Flow's `getNodes()` + `setViewport()` / `fitView()`; non-member dim becomes per-node className via React Flow's `nodes` prop. Folded into the Phase 3 migration estimate.**
  - **[~1]** Bookmark markers on the animation timeline: bottom timeline with play/pause/scrub, "+ bookmark" pauses and prompts for a name at the current playhead, click marker to jump-and-pause, shift-click to delete. Refactored `animation.ts` onto a master playback clock. **Master clock survives unchanged. Re-port required for how animation drives node visual state: push per-frame node state into React Flow via `setNodes()` instead of mutating SVG attrs directly. Folded into the Phase 3 migration estimate.**
  - **[~½]** One-click "build and run": "▶ run" button in the toolbar spawns `go run .` and streams stdout/stderr to a "topology run" output channel; button toggles to "■ stop" while running, status pill shows running/ok/error/cancelled. **Renderer-independent — survives unchanged.**

- **Phase 3 — structural editing (mental-model sync → code change)** **[~1.25 remaining; migration tail came in ~¾ vs. ~½ estimate, testing foundation done]**
  - 🟢 Testing foundation (Tier 1 contract tests — prerequisite to further Phase 3 / Phase 9 work). See [Testing strategy](#testing-strategy) for the bar. **[~1 total, done]**
    - **[~¼, done]** ✅ *Spec round-trip* (Vitest, `tools/topology-vscode/test/round-trip.test.ts`). Fixtures under `test/fixtures/specs/`: minimal 2-node, full-fields (every currently-dropped field — `notes`, `route: snake`, `lane`, named ports — marked `it.fails` so the Phase 9 gap is a tracked failing test rather than a paragraph), plus the live `topology.json` read at test time. Round-trip via `specToFlow()` / `flowToSpec()` in `rf/adapter.ts`.
    - **[~¾, done]** ✅ *Topogen goldens* (Go, `cmd/topogen/testdata/`). Each case is a `spec.json` + `expected/Wiring.go` pair; `TestGolden` diffs against expected, `-update` rewrites. `TestGoldenBuilds` writes generated output into a temp module that `replace`s the parent module and runs `go build ./...` — generated code is guaranteed to compile against the real node packages, not just match bytes. Seed cases: canonical spec (live `topology.json`), renamed-ids spec (locks in the `Name` field wiring), feedback-ack spec.
    - **[~⅛, done]** ✅ Tier 2 retro: id-rename atomicity unit test (`test/rename.test.ts`, table case across edges / `timing.fires` / `timing.state` keys / view `nodeIds` / fold `memberIds` / `lastSelectionIds`, plus reject-on-clash and reject-on-invalid-ident). Locks down the already-shipped rename feature against partial-overlap regressions. Required extracting `applyRename` into `rename-core.ts` so tests don't pull in DOM imports.
    - **[~⅛, done]** ✅ Tier 2 retro: legacy `{x,y,w,h}` → RF `{x,y,zoom}` camera conversion table case (`test/camera.test.ts`). Required extracting `viewportToBox` / `boxToViewport` into `rf/camera.ts`.
  - 🟢 React Flow migration (commits `70356ea`, `e449fcc`).
    - **[~1.25, done]** ✅ RF substrate inside the webview; spec ↔ RF node/edge adapter; camera persistence in RF-native `{x,y,zoom}` (legacy `{x,y,w,h}` viewBox cameras auto-convert on load); saved-views frame + dim re-ported via a renderer-agnostic bridge (`rf/bridge.ts`) so legacy `view.ts` / `views.ts` stay largely intact; saved-view membership is now selection-first (RF `onSelectionChange` capture) with viewport-containment fallback; pan is free while a view is active; click an active view to clear; edge pulses via a custom `AnimatedEdge` (RF `getBezierPath`) with WAAPI registered against the master playback clock — pulses survive RF re-renders because they live in React's tree, not as foreign DOM children; node id rename re-ported (centered input via RF `onNodeDoubleClick`); esbuild builds JSX, bundles CSS, minifies non-watch (1.4 MB → 353 KB). Removed dead lit-html-only files.
    - **[~¾, done]** ✅ (estimated ~½, actual ~¾ — frame-mismatch tax: input/label alignment under viewport scale, edge-to-handle gaps, pulse desync after selection re-mounts) Custom `AnimatedNode` owns the per-node flash overlay (WAAPI registered against the master clock) and `state.field=value` text (subscribes to the playback clock). Adapter precomputes `fireTimes` + `stateFields` segments. SVG overlay inside `.react-flow__viewport` removed; `render/animation.ts` trimmed to `resetAnimations`. Rename input rewritten as `contenteditable` directly on the `.node-label` div — same DOM element, same RF transform, no positioning math, so font/scale/zoom can't drift. Handle styling pinned to `left:0` / `right:0` (no `min-width`) so edges meet nodes flush. Nodes use `width:max-content` + `minWidth:data.width` so longer ids grow the box. Stability: `registerAnimation` returns a disposer that splices on cancel (no unbounded growth across re-renders) and seeds `currentTime` from the live `getCurrentMs()` (animations registered mid-playback after a selection-driven re-mount stay in sync — pulses no longer slip out of their visible window).
  - **[~⅛]** ⏳ Selection model (click, shift-click, marquee). (React Flow built-in; cost is wiring it to the spec.)
  - **[~⅛]** ⏳ Delete-to-remove for selected nodes/edges. (React Flow built-in.)
  - **[~½]** ⏳ Port rendering on nodes; drag-from-port-to-port to create edges. (React Flow handles ghost-edge + hit-testing; remaining cost is **channel-type inference** for codegen — that's still custom.)
  - **[~⅛]** ⏳ Edit existing edges: drag an endpoint to a different port/node to reroute; change edge kind/role via context menu. (React Flow built-in.)
  - **[~¼]** ⏳ Node palette with drag-to-create. (React Flow has drag-and-drop pattern; cost is the palette UI itself.)
  - 🟡 In-place text editing for annotation and labels.
    - **[~1, done]** ✅ Node id rename: double-click a node, type new id, Enter to commit. Atomically rewrites edges (source/target), `timing.fires`, `timing.state` keys, and viewer state (saved-view nodeIds, fold memberIds, lastSelectionIds). Validates against topogen's safe-Go-ident regex.
    - **[~⅛]** ⏳ Sublabel / value / annotation note in-place editing. (Cheaper than the original ~¼: the contenteditable-on-the-rendered-element pattern from id rename is reusable — sublabel slots into `AnimatedNode` next to `.node-label` the same way, with no new positioning math.)
  - 🟡 Each gesture verified end-to-end. (Folded into each gesture's estimate.)
    - ✅ Verified for id rename: every wired node struct gained a `Name string` field; topogen emits `Name: "<n.id>"`; each node's `Update` prints `n.Name` instead of a hard-coded prefix, so a rename in the editor shows up directly in the run log. (Side benefit: the spec id is now the runtime identity, not just a code-gen variable name.)
    - ⏳ Verification for the remaining gestures lands with each one as it's built.
  - 🟡 Tier 3 gesture integration tests (Playwright, after the gestures above stabilize — defer until churn slows). **[~1–1.5 total]**
    - **[~¾]** ⏳ Playwright + vscode-webview harness; first gesture case (pays the harness cost once).
    - **[~⅛]** ⏳ Port-drag creates edge with inferred channel type; topogen-generated Go contains the new `chan`.
    - **[~⅛]** ⏳ Delete-selection removes node + incident edges + `timing.fires[id]`.
    - **[~⅛]** ⏳ Palette-drag at coords persists position across reload.
    - **[~⅛]** ⏳ Rename to clashing id rejects with inline error.

- **Phase 4 — fold/unfold** **[~1]**
  - **[~½]** Sidecar `folds[]` mapped onto React Flow's subflow / parent-node primitive. Edges crossing the boundary re-route via React Flow's built-in handling; nested folds need manual coordination.
  - **[~¼]** Right-click → fold; double-click placeholder → expand.
  - **[~¼]** Decide: are folds purely visual, or do they also become generated Go sub-packages? Default: purely visual (sidecar only). Revisit if code-gen organization wants matching structure.

- **Phase 5 — comparison** **[~1.5]**
  - **[~½]** Side-by-side mode loading two specs (current vs. git HEAD, or two files).
  - **[~½]** Computed diff: added / removed / repositioned / rewired / retimed. (Mechanical.)
  - **[~½]** Visual highlight (color tint, badges) for diff items. (Two-pane camera sync UX is the variable part.)

- **Phase 6 — keyframed motion (when a topology actually rewires during its cycle)** **[~2.5, risk to ~4]**
  - **[~⅛]** ⏳ Tier 1 round-trip coverage extended to `positionKeyframes` / `endpointKeyframes` / `visibility` *before* any UI lands (each new spec field becomes a fixture row; the bridge can't silently drop them).
  - **[~¼]** Schema: `positionKeyframes`, `endpointKeyframes`, `visibility`.
  - **[~¾]** Renderer tweens between keyframes during playback.
  - **[~½]** Decide whether `topogen` reads keyframes (yes if the runtime causes the change; no if it's pure presentation). Spec-vs-viewer judgment per keyframe kind is the risk multiplier.
  - **[~1]** Record-mode editor: drag at non-zero playhead → new keyframe.

- **Phase 7 — trace replay rejoins the pipeline** **[several, see [trace-replay-plan.md](trace-replay-plan.md)]**
  - **[~2–3]** Implement value-flow tracing in the generated Go (per [trace-replay-plan.md](trace-replay-plan.md)). (Dominates; Go edits are token-light.)
  - **[~1]** Editor loads or streams traces; replays observed behavior on the same diagram.
  - **[~1]** Side-by-side: intended animation (from spec) vs. observed animation (from trace). Drift becomes visible.

- **Phase 8 — polish** **[open-ended, ~⅜ saved by React Flow + the AnimatedNode pattern]**
  - **[~⅛]** Undo / redo over the spec. (Cheaper than the original ~¼: the "mutate spec → rebuild via `specToFlow` → `setNodes`/`setEdges`" pipeline is already proven by id rename's `rerender` callback; an undo stack of spec snapshots plugs into the same callback. Viewer state excluded.) **Substrate:** use [`zundo`](https://github.com/charkour/zundo), the dominant Zustand undo middleware (~2KB, snapshot-based with built-in grouping/diffing). Wraps the spec store in one line; avoids hand-rolling and maintaining a stack.
  - **[~¼]** Snap-to-grid; alignment guides. (React Flow has snap-to-grid built in; alignment guides are custom but cheap.)
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

**Tier → Phase map and net savings:**

| Tier | Cost | Saved (Phases 3–6) | Net | Lives in |
|---|---|---|---|---|
| 1 — contract (round-trip + goldens) | ~1 | ~3–4 | **+2–3** | Phase 3 testing foundation |
| 2 — bridge units | ~½ | ~1–1.5 | **+½ to +1** | Phase 3 retros; Phase 6 keyframe extension |
| 3 — gesture (Playwright) | ~1–1.5 | ~1.5–2 | **~0 to +½** | end of Phase 3 |
| 4 — e2e + visual | ~1 | ~1.5 | **+½** | Phase 8 (e2e); Phase 9 (visual) |

Total saved across the plan: roughly **3–4.5 cap hits net**
against ~8 remaining for Phases 3–6. Beyond the cap-hit count,
contracts becoming enforced rather than remembered compounds in
ways the table doesn't capture.

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
- Phase 3: ~3.25 cap hits with React Flow migration (~2 migration —
  ~1.25 substrate + ~¾ tail, slightly over the ~½ tail estimate due
  to frame-mismatch debugging across the SVG↔RF transition — plus
  ~1.25 remaining gestures), down from a previous ~2.5 estimate
  *without* the migration but with everything custom. Slight overrun
  on Phase 3 alone, but React Flow's value compounds in Phases 4 and
  8. Node id rename shipped in ~1 (pre-migration; re-ported during
  the substrate migration). Port-drag, selection, marquee, and
  edge-edit collapse to library calls; channel-type inference for
  codegen stays custom. **Lesson logged for Phases 4 and 6:** when
  migrating between rendering frames (SVG ↔ RF, keyframe-driven UI),
  budget extra for things that visually overlay a primitive — they
  must live in the same DOM frame and transform context as the
  primitive itself, or alignment / lifecycle / scale drift somewhere.
- Phase 4: ~1 cap hit (down from ~2). React Flow's subflow primitive
  handles edge re-routing across collapsed boundaries; sidecar
  schema and right-click UX are the remaining work. Nested folds
  still need manual coordination.
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
  another ~⅛ off the undo line — ~⅜ saved total vs. fully custom.

Phases 3–6 remaining: **~7.25 cap hits** (Phase 3 ~1.25 + Phase 4 ~1
+ Phase 5 ~1.5 + Phase 6 ~2.5, +0.5 for sublabel/undo savings already
booked). Headline pipeline through Phase 3: **~1.25 more cap hits**
from where this branch sits (substrate + migration tail done;
remaining is gestures + Tier 3 tests). Phases 4 and 8 stay materially
cheaper than the pre-RF estimates.

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
