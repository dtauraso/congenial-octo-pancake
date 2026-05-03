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
4. **Producing diagram artifacts** (SVG export) for sharing or
   documentation. Distant fourth.

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

## What this tool is *not* trying to be

- A general-purpose graph editor.
- A multi-user collaborative tool.
- An execution environment (the Go binary runs out-of-band).
- A presentation tool. Sharing is incidental.

## Rendering substrate: React Flow inside the vscode webview

The previous `tools/topology-editor/` (standalone browser, React Flow) was deleted because it bypassed the codegen pipeline, not because React Flow was the wrong library. Adopting React Flow **inside** the existing vscode webview — with `topogen` still authoritative — replaces large parts of Phases 3, 4, and 8 with library-provided primitives:

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

- **Phase 3 — structural editing (mental-model sync → code change)** **[~1.5 remaining + ~1.5 React Flow migration = ~3]**
  - **[~1.5]** ⏳ React Flow migration: replace lit-html SVG renderer with React Flow inside the webview; adapters `topology.json` ↔ React Flow node/edge model. Includes re-porting Phase 1 layout-invariants (pan/zoom save), Phase 2 saved-views frame/dim, and Phase 2 animation-driven node state onto React Flow primitives. Build-and-run, codegen integration, sidecar schema, and master playback clock are renderer-independent and need no changes.
  - **[~⅛]** ⏳ Selection model (click, shift-click, marquee). (React Flow built-in; cost is wiring it to the spec.)
  - **[~⅛]** ⏳ Delete-to-remove for selected nodes/edges. (React Flow built-in.)
  - **[~½]** ⏳ Port rendering on nodes; drag-from-port-to-port to create edges. (React Flow handles ghost-edge + hit-testing; remaining cost is **channel-type inference** for codegen — that's still custom.)
  - **[~⅛]** ⏳ Edit existing edges: drag an endpoint to a different port/node to reroute; change edge kind/role via context menu. (React Flow built-in.)
  - **[~¼]** ⏳ Node palette with drag-to-create. (React Flow has drag-and-drop pattern; cost is the palette UI itself.)
  - 🟡 In-place text editing for annotation and labels.
    - **[~1, done]** ✅ Node id rename: double-click a node, type new id, Enter to commit. Atomically rewrites edges (source/target), `timing.fires`, `timing.state` keys, and viewer state (saved-view nodeIds, fold memberIds, lastSelectionIds). Validates against topogen's safe-Go-ident regex.
    - **[~¼]** ⏳ Sublabel / value / annotation note in-place editing.
  - 🟡 Each gesture verified end-to-end. (Folded into each gesture's estimate.)
    - ✅ Verified for id rename: every wired node struct gained a `Name string` field; topogen emits `Name: "<n.id>"`; each node's `Update` prints `n.Name` instead of a hard-coded prefix, so a rename in the editor shows up directly in the run log. (Side benefit: the spec id is now the runtime identity, not just a code-gen variable name.)
    - ⏳ Verification for the remaining gestures lands with each one as it's built.

- **Phase 4 — fold/unfold** **[~1]**
  - **[~½]** Sidecar `folds[]` mapped onto React Flow's subflow / parent-node primitive. Edges crossing the boundary re-route via React Flow's built-in handling; nested folds need manual coordination.
  - **[~¼]** Right-click → fold; double-click placeholder → expand.
  - **[~¼]** Decide: are folds purely visual, or do they also become generated Go sub-packages? Default: purely visual (sidecar only). Revisit if code-gen organization wants matching structure.

- **Phase 5 — comparison** **[~1.5]**
  - **[~½]** Side-by-side mode loading two specs (current vs. git HEAD, or two files).
  - **[~½]** Computed diff: added / removed / repositioned / rewired / retimed. (Mechanical.)
  - **[~½]** Visual highlight (color tint, badges) for diff items. (Two-pane camera sync UX is the variable part.)

- **Phase 6 — keyframed motion (when a topology actually rewires during its cycle)** **[~2.5, risk to ~4]**
  - **[~¼]** Schema: `positionKeyframes`, `endpointKeyframes`, `visibility`.
  - **[~¾]** Renderer tweens between keyframes during playback.
  - **[~½]** Decide whether `topogen` reads keyframes (yes if the runtime causes the change; no if it's pure presentation). Spec-vs-viewer judgment per keyframe kind is the risk multiplier.
  - **[~1]** Record-mode editor: drag at non-zero playhead → new keyframe.

- **Phase 7 — trace replay rejoins the pipeline** **[several, see [trace-replay-plan.md](trace-replay-plan.md)]**
  - **[~2–3]** Implement value-flow tracing in the generated Go (per [trace-replay-plan.md](trace-replay-plan.md)). (Dominates; Go edits are token-light.)
  - **[~1]** Editor loads or streams traces; replays observed behavior on the same diagram.
  - **[~1]** Side-by-side: intended animation (from spec) vs. observed animation (from trace). Drift becomes visible.

- **Phase 8 — polish** **[open-ended, ~½ saved by React Flow]**
  - **[~½]** SVG export. (React Flow has a `toImage` helper but custom-styled output may still need manual SVG rebuild.)
  - **[~¼]** Undo / redo via React Flow + Zustand history pattern. (Spec history; viewer state excluded. Cheap because React Flow's state model is already command-friendly.)
  - **[~¼]** Snap-to-grid; alignment guides. (React Flow has snap-to-grid built in; alignment guides are custom but cheap.)

**Status snapshot (this branch):** Phases 1 and 2 complete. Phase 3
underway: node id rename ships and is verified end-to-end through
topogen and the run log. Selection model, delete,
port-drag wiring, node palette, and sublabel/note editing still
pending. Phases 4–8 not started. The visual → spec → Go pipeline runs
on every save with a status indicator, and recall affordances (saved
views, bookmarks + playback control) are in place.

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
- Phase 3: ~3 cap hits with React Flow migration (~1.5 migration
  + ~1.5 remaining gestures), down from a previous ~2.5 estimate
  *without* the migration but with everything custom. Net wash on
  Phase 3 alone, but React Flow's value compounds in Phases 4 and 8.
  Node id rename shipped in ~1 (pre-migration; will need a small
  re-port). Port-drag, selection, marquee, and edge-edit collapse
  to library calls; channel-type inference for codegen stays custom.
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
- Phase 8: open-ended; React Flow's built-in undo pattern and
  snap-to-grid trim ~½ off vs. fully custom.

Phases 3–6 remaining: **~8 cap hits** with React Flow migration
(down from ~8.5 fully custom; ~13 pre-cleanup). Headline pipeline
through Phase 3: **~3 more cap hits** from where this branch sits
(includes the React Flow migration; thereafter Phases 4 and 8 are
materially cheaper).

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
