# Visual Topology Tool: design surface for the Go code

The active plan. The tool is the **design surface where decisions about
the Go code get made**. You sketch the topology visually because sketching
is how you decide what the Go code should be; `topogen` mechanically
translates that decision into Go; the Go code is the deliverable.

```
visual editor  →  topology.json  →  generated Go  (topogen)  →  running system
                                                                       ↓
                                                              (future) trace
                                                                       ↓
                                                            replays into editor
```

Editing the diagram is editing the spec; editing the spec regenerates code.
Trace replay ([trace-replay-plan.md](trace-replay-plan.md)) is the rightmost
arrow; deferred until the visual → spec → Go loop runs smoothly.

## How this doc is organized

This index covers cross-cutting decisions and a phase table. Each phase has
its own file under [visual-editor/](visual-editor/). Load only the phase(s)
you're working on.

| Phase | Status | File | Cap est. | $ extra-usage est. |
|---|---|---|---|---|
| 1 — pipeline foundations | ✅ done | [phase-1.md](visual-editor/phase-1.md) | ~2 | ~$120 |
| 2 — recall affordances | ✅ done | [phase-2.md](visual-editor/phase-2.md) | ≤2 | ≤$120 |
| 3 — structural editing | 🟡 ~½ remaining (3 Tier-3 follow-ups) | [phase-3.md](visual-editor/phase-3.md) | ~2.75 | ~$30 left |
| 4 — fold/unfold | ✅ done; nested ⏳ | [phase-4.md](visual-editor/phase-4.md) | ~⅜ actual | ~$30 nested |
| 4.5 — plugin hardening (audit) | 🟡 4.5.1 done; 4.5.2–4.5.6 ⏳ | [phase-4.5.md](visual-editor/phase-4.5.md) | ~3.75 | ~$165 left |
| 5 — comparison | ⏳ next-up; open questions resolved | [phase-5.md](visual-editor/phase-5.md) | ~1.875 | ~$110 |
| 5.5 — animation model rewrite | ⏳ gates Phase 6 | [phase-5.5.md](visual-editor/phase-5.5.md) | ~2 (risk 3) | ~$120 (risk $180) |
| 6 — keyframed motion | ⏳ rebudget after 5.5 | [phase-6.md](visual-editor/phase-6.md) | ~2.5, risk ~4 | ~$225 (risk $360) |
| 7 — trace replay | ⏳ | [phase-7.md](visual-editor/phase-7.md) | ~6 | ~$280 |
| 8 — polish (undo, snap, e2e) | ⏳ | [phase-8.md](visual-editor/phase-8.md) | ~1.375 | ~$80 |
| 9 — SVG diagram parity | ⏳ | [phase-9.md](visual-editor/phase-9.md) | ~2 | ~$180 |

**$ totals (remaining):** ~$1,100 midpoint to ship Phases 3 → 9 + Phase 4.5 hardening, range ~$550–$1,950 depending on workload-shape outcomes. See [risk-and-effort.md](visual-editor/risk-and-effort.md) for the cap-hit → $ conversion methodology.
| Cross-cutting — testing strategy | — | [testing-strategy.md](visual-editor/testing-strategy.md) | — |
| Cross-cutting — risk & effort | — | [risk-and-effort.md](visual-editor/risk-and-effort.md) | — |

## ▶ NEXT UP

The most load-bearing remaining work, in priority order. Pick whichever
matches the cap available and the kind of break you'd most regret.

1. **Phase 5 — comparison [~1.5 + ~⅜ tests].** The headline next phase.
   Side-by-side diff against git HEAD or a second spec. See [phase-5.md](visual-editor/phase-5.md).
2. **Phase 4.5.2+ — plugin hardening continuation.** 4.5.1 (data-loss bugs)
   shipped; remaining bands are correctness, packaging, hygiene, test
   coverage. See [phase-4.5.md](visual-editor/phase-4.5.md). Worth running
   before Phase 5 if comparison's two-pane mode would amplify any unfixed
   audit findings.
3. **Phase 4 nested folding follow-up [~½, ⏳].** Single-level folds work;
   pick up only when a real topology hits the level-of-nesting wall.
4. **Phase 3 Tier 3 follow-ups [~⅜ remaining, ⏳].** Three queued cases
   (port-drag → chan, palette-drag-position, port-drag mismatched-kinds
   fallback). Lower leverage than Phase 5; opportunistic.

## What the tool is for, in priority order

1. **Letting design decisions become code fast.** A change in the visual
   editor should produce updated Go within seconds. This is the load-bearing
   value of the tool.
2. **Holding the design stable across sessions** so you can come back to it
   without re-deriving. Spatial memory + saved views + bookmarks make the
   diagram a durable working surface.
3. **Replaying the dynamic story** as a refresher dose for "what happens
   when input arrives." Animation is comprehension, not decoration.
4. ~~**Producing diagram artifacts** (SVG export).~~ *Dropped — see Phase 8.*

When design conflicts arise, tie-break toward whichever serves design
throughput best.

## Spec vs viewer state

Two storage surfaces:

- **`topology.json` — the spec.** Round-trips through `topogen`. Every field
  in this file is something the generated Go code reads or depends on.
  Nothing else belongs here.
- **`topology.view.json` — viewer state, sidecar.** Saved views, bookmarks,
  fold/unfold state, last camera position, animation playback preferences.
  `topogen` ignores this file.

Whether keyframes are spec or viewer is a judgment call: if the moving /
rewiring is *part of the simulation's behavior* (the Go runtime causes
it), keyframes belong in the spec. If it's purely a presentation animation,
viewer state. Default: spec, on the assumption that animated change reflects
real Go-side change.

### Spec fields

The existing schema (nodes, edges, ports, kinds, roles, `timing.steps`)
plus, when needed: `positionKeyframes`, `endpointKeyframes`, `visibility`
keyframes.

### Viewer state fields

```jsonc
{
  "views": [
    { "name": "detector subsystem",
      "viewport": { "x": 200, "y": 50, "w": 600, "h": 400 },
      "nodeIds": ["sbd0", "sd0", "sbd1", "sd1", "a0"] }
  ],
  "folds": [
    { "id": "fold-detectors", "label": "detectors",
      "memberIds": ["sbd0", "sd0", "sbd1", "sd1"],
      "position": [600, 100], "collapsed": true }
  ],
  "bookmarks": [{ "name": "ack returns", "t": 0.913 }],
  "camera": { "x": 0, "y": 0, "zoom": 1.0 },
  "lastSelectionIds": ["i0"]
}
```

## Codegen integration

The pipeline is broken if editing the diagram doesn't produce running Go.
`topogen` is in the editing loop from day one (Phase 1).

**On every spec save:**
1. Plugin invokes `topogen` (debounce ~250ms, never overlap; queue latest).
2. Output Go files are written to their canonical location.
3. Status indicator: green (synced), amber (regenerating), red (error).
4. Errors from `topogen` should appear inline near the offending node/edge
   (deferred — currently bare strings).

**Build / run:** one-click "▶ run" invokes `go run ./cmd/...` and surfaces
the result.

## Editing decisions that affect code shape

Some authoring gestures are declarations `topogen` will translate into Go:

| Gesture | What `topogen` will generate |
|---|---|
| Drag-add a node | New struct + goroutine + run-loop |
| Drag-connect a port | New channel; type inferred from port spec |
| Set port direction | Channel direction in struct field |
| Pick node role | Struct embedded type or behavior preset |
| Set channel buffer size (advanced) | `make(chan T, N)` capacity |
| Mark edge as feedback-ack | Generated wiring that closes the loop |

The editor is a **declarative front-end for code generation**, not a paint
program. Every gesture has a code consequence.

## Design criteria

- **Codegen latency under one second.** Beyond ~one second the loop breaks
  down and the editor feels like a documentation tool.
- **Stable spatial layout** across sessions. Re-load relies on spatial
  memory; never auto-shift positions.
- **Spec-vs-viewer cleanliness.** No viewer state in `topology.json`.
- **Glanceability.** Color = role, shape = role-class, edge style = kind.
- **Saved views, bookmarks, fold/unfold** for re-load fluency.
- **Errors surface where they happen.**

## Rendering substrate: React Flow inside the vscode webview

The previous standalone `tools/topology-editor/` (browser, React Flow) was
deleted because wiring Claude Code chat into a browser would have been more
work than building a vscode plugin. React Flow itself was not the problem.
Adopting React Flow **inside** the existing vscode webview — with `topogen`
still authoritative — replaced large parts of Phases 3, 4, and 8 with
library-provided primitives:

- **Phase 3:** selection, port-drag edge creation, node palette — built in.
- **Phase 4:** fold geometry — RF subflow primitive covers most of it.
- **Phase 8:** undo/redo — `zundo` Zustand middleware.

What stays custom: `topogen` invocation, spec/viewer split, animation
timeline + bookmarks, keyframed motion + record-mode editor, trace replay.

## What success looks like

1. **Edit-to-running-Go test.** A small structural change reaches running
   Go in under 30 seconds end-to-end. Headline number.
2. **The five-second test.** Two weeks away, you open the diagram and the
   topology snaps back into your head in five seconds.
3. **The change-and-recompare test.** A small change a day ago is
   immediately visible when you re-open.
4. **The "show me just X" test.** One click frames a subsystem and dims context.
5. **The "what happens at moment Y" test.** One click jumps to a named
   transition in the animation.
6. **The decision-feels-like-sketching test.** Modifying the topology
   feels like sketching, not data entry.
7. **(Phase 7) The drift test.** Replay a trace next to the spec animation;
   any disagreement is visible.

## Status snapshot (this branch)

Phases 1, 2, and 4 complete. Phase 3 substrate migration done; remaining is
three Tier-3 e2e follow-ups (~⅜). Phase 4.5.1 (data-loss bugs) shipped;
4.5.2–4.5.6 ⏳. The visual → spec → Go pipeline runs on every save with a
status indicator; recall affordances (saved views, bookmarks, playback) in
place.

Phase 1 alone changed the tool from "live preview" to "design surface."
Phases 2–3 made it a durable design surface. Phases 4–6 are recall +
dynamics power-tools. Phase 7 is observed-vs-intended. Phase 8 is comfort.

## What the AI does in this loop

The tool's value is *yours* — the topology you design and the system that
emerges from it. The AI's contribution is two-sided:

- **Inside the tool's construction:** picking implementation pieces,
  translating between your conceptual model and the rendering / persistence
  / codegen layers, maintaining boring invariants so they don't bleed time.
- **Inside the design loop the tool enables:** once the pipeline is smooth,
  the AI participates as a collaborator on topology design — you propose a
  structural change verbally or by sketching, the AI reasons about
  consequences, the editor makes the change concrete, `topogen` produces
  the code, you run it and see.

What the AI doesn't do: decide what the topology means, or which design
direction is interesting, or what the system is *for*.
