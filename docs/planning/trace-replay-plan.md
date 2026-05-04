# Trace Replay: runtime → viewer loop

Plan for closing the runtime → viewer loop. The Go runtime emits an ordered
list of structurally-interesting events; the webview replays them as a visual
aid at whatever pace serves comprehension. No wall-clock or sim-time anywhere.

**The loop is non-negotiable: the simulation must be implemented in Go.
The "actual" animation is always a replay of logs from a Go run.** The
webview is never the source of truth for behavior. Anything you see move
on screen is a re-rendering of something the Go code did.

Gitignored.

---

## Goal

Replace hand-authored `timing.steps` in `topology.json` with an ordered event
list emitted by the Go runtime. The diagram becomes a renderer of observed
behavior, not a hand-drawn cartoon of expected behavior. Both **value-flow
events** (fires, sends, state changes) and **structural events** (node moves,
edge rewires, additions, removals) are captured the same way: as items in
the trace.

## Non-goals

- **Physical timing fidelity.** Animation pacing is a viewer concern, not a
  runtime fact. The runtime never emits timestamps.
- **Reproducing exact concurrent interleavings.** Whatever order the recorder
  channel receives events in is *a* legal interleaving; that's enough for a
  visual aid.
- **Authoring animation in the viewer.** The viewer never invents motion the
  runtime didn't produce. If a node moves on screen, the Go code emitted a
  `node-move` event. No exceptions.

## Event model

A trace is an append-only `[]Event`. Two families:

**Value-flow events** (existing system, fixed structure):
- `recv` — node received a value at an input port.
- `fire` — node fired (gate, detector, etc.).
- `send` — value sent on a channel/edge.
- `state-set` — internal state field changed (e.g. `held`).
- `latch-hold` / `latch-release` — latch state transitions.

**Structural events** (new — graph mutates over time):
- `node-add` — a node enters the graph (with role + initial position).
- `node-remove` — a node leaves the graph.
- `node-move` — a node's position changes (from → to).
- `edge-add` — a new edge appears (source, target, kind).
- `edge-remove` — an edge is dropped.
- `edge-rewire` — an existing edge's source or target changes.
- `node-attr-set` — non-state visual attrs change (label, role, class) if needed.

```go
type Event struct {
    Step   int            // monotonic, assigned by the recorder
    Kind   string         // closed vocabulary (see above)
    Node   string         // for node-scoped events
    Edge   string         // for edge-scoped events
    Field  string         // for state-set / attr-set
    Value  any            // generic payload
    From   *Position      // for node-move
    To     *Position      // for node-move
    Source string         // for edge-add / edge-rewire
    Target string         // for edge-add / edge-rewire
    Role   string         // for node-add
    EdgeKind string       // for edge-add
    Position *Position    // for node-add
}
```

JSON-lines on disk:

```jsonl
{"step":0,"kind":"recv","node":"in0","value":-1}
{"step":1,"kind":"fire","node":"readGate"}
{"step":2,"kind":"send","edge":"readGateToI0"}
{"step":3,"kind":"state-set","node":"i0","field":"held","value":-1}
{"step":4,"kind":"send","edge":"i0ToI1"}
{"step":47,"kind":"node-move","node":"i3","from":[400,300],"to":[420,310]}
{"step":48,"kind":"edge-rewire","edge":"e7","target":"i5"}
{"step":49,"kind":"node-add","node":"i6","role":"inhibitor","position":[500,250]}
{"step":50,"kind":"edge-add","edge":"e9","source":"i3","target":"i6","edgeKind":"chain"}
{"step":51,"kind":"node-remove","node":"i2"}
```

The vocabulary is closed. New visual behaviors require adding a kind to
both runtime and viewer; validate at parse time.

## The simulation lives in Go, not in the viewer

This is the load-bearing rule of the whole system:

1. The thing being simulated — including any node movement, rewiring,
   addition, or removal — is implemented in Go.
2. The Go runtime emits events for *everything visible*, structural or
   otherwise.
3. The viewer's only job is to apply those events to its current graph
   state and render the result.

If a topology rewires itself as part of its dynamics (e.g. lateral
inhibition strengthening some edges and dropping others, or new
inhibitor stages spawning under load), that logic lives in Go and emits
`edge-rewire` / `node-add` events. The viewer doesn't model the rewiring
rule; it replays the rewiring decisions.

This is the only design that keeps the diagram honest. If the viewer ever
generates motion the runtime didn't emit, the loop is broken — the
animation no longer reflects what the code does.

## Runtime instrumentation

One `Trace` value threaded through wiring:

```go
type Trace struct {
    ch     chan Event
    events []Event
}

func (t *Trace) Emit(e Event) { t.ch <- e }
```

A single goroutine drains `ch`, assigns `Step`, appends to `events`. All
events serialize through one channel; that order is the causal-enough story.

Per node type, value-flow instrumentation is one line at each interesting
moment:

- channel send → `trace.Emit(Event{Kind:"send", Edge: edgeID})`
- AND-gate fires → `trace.Emit(Event{Kind:"fire", Node: n.ID})`
- inhibitor updates `held` → `Kind:"state-set", Field:"held", Value: v`

Structural instrumentation lives wherever the topology mutates. For the
current static circuit, this is empty. For future dynamics — e.g. a
lateral-inhibition rule that drops a losing edge — the rule itself emits
the `edge-remove` as it acts:

```go
func (n *Inhibitor) suppress(neighbor *Inhibitor) {
    edgeID := n.edgeTo(neighbor)
    delete(n.outEdges, neighbor.ID)
    n.trace.Emit(Event{Kind: "edge-remove", Edge: edgeID})
}
```

The runtime is always the one deciding *what* changes; the trace records
*that* it changed. Backpressure: buffered recorder channel; if full, log a
warning and block briefly rather than drop.

## Two delivery modes

**Recorded.** `topogen run --trace=out.jsonl` runs N cycles and writes the
file. Webview has a "load trace" action. Trace files become commitable test
fixtures.

**Live.** `topogend` (existing daemon) streams events over its websocket as
they occur. Webview connects, animates as events arrive. Same event format;
viewer doesn't care which source it's reading.

## Viewer changes

The viewer maintains two things:

1. **Current graph state** — a mutable copy of nodes/edges/positions. Starts
   from the initial structure (either from `topology.json` or from a leading
   block of `node-add`/`edge-add` events; see below). Each structural event
   mutates this state.
2. **A step index** — current position in the event stream.

For each event applied, the viewer triggers the corresponding visual:

| Event kind        | Visual effect                                                  |
|-------------------|----------------------------------------------------------------|
| `recv`            | Update node value label                                        |
| `fire`            | White-overlay flash on node                                    |
| `send`            | Dashoffset pulse along edge                                    |
| `state-set`       | Update `held=…` text on node                                   |
| `latch-hold`      | Tint latch node while held                                     |
| `latch-release`   | Untint                                                         |
| `node-add`        | Fade in at given position                                      |
| `node-remove`     | Fade out, then drop from graph                                 |
| `node-move`       | Tween position from `from` to `to`                             |
| `edge-add`        | Draw edge in (with stroke-dash reveal)                         |
| `edge-remove`     | Fade out, drop                                                 |
| `edge-rewire`     | Tween endpoint to new source/target; re-route                  |
| `node-attr-set`   | Apply attr (e.g. role change → re-skin)                        |

Pacing is a viewer setting:

- **Auto-play:** N ms per event, configurable.
- **Step:** advance one event per arrow-key press.
- **Scrub:** drag a slider over `[0, len(events)-1]`.

The viewer is now a small graph-state machine + tweening layer, not a
template renderer.

### Layout, routing, tweening

Once nodes can move and edges can rewire, the renderer needs:

- **Edge routing that handles moving endpoints** — re-route on every
  position change. Reasonable choices: keep current orthogonal `geom.ts`
  routing and recompute per move event; or adopt an off-the-shelf router
  (libavoid, ELK, dagre).
- **Tweening between graph states** — interpolate node position, edge
  endpoint, opacity. Web Animations API handles this; or use GSAP / Framer
  Motion / Anime.js for richer control.
- **Layout for added nodes** — a `node-add` event must specify a position
  (the runtime decides where new nodes appear; the viewer doesn't pick).
  If a layout *algorithm* is wanted, it lives in Go and emits resulting
  positions; the viewer never runs layout itself.

This last point matters: layout-as-a-runtime-emission keeps the rule
"viewer never invents motion" intact. If the topology grows and you want
force-directed positioning, the Go side runs the force simulation and
emits `node-move` events for the resulting positions.

### Off-the-shelf renderers (consider, don't necessarily adopt)

If the custom SVG renderer becomes a bottleneck once dynamics arrive,
candidates that natively handle dynamic graphs:

- **Cytoscape.js** — most complete; nodes/edges, layouts, animations,
  edge routing.
- **React Flow / xyflow** — node-editor UX; built-in animation primitives.
- **D3 + d3-force** — force layout + transitions; flexible but DIY.

Trade-off: adopting one means giving up the hand-tuned style guide for the
live viewer. Acceptable resolution: the SVG style guide governs *static
documentation diagrams* (committed under `diagrams/`), and the live viewer
uses an off-the-shelf renderer themed to approximate the style. They
become two artifacts with different rules.

Decision deferred until structural events are actually flowing and the
custom renderer's pain is measurable.

## Schema impact

`topology.json` loses `timing.steps`. It now plays one of two roles:

1. **Initial structure**, when a trace replays a run that started from a
   fixed graph. The trace contains only behavioral events; structure is
   read from the spec.
2. **Empty / placeholder**, when a trace is fully self-describing — i.e.
   the trace's leading events are `node-add`/`edge-add` calls that
   construct the graph from nothing. Useful for runs where the topology
   itself emerges from execution.

The viewer accepts either. A trace file may declare its required initial
structure or stand alone.

Trace files (`*.trace.jsonl`) are a new artifact type. Short ones become
test fixtures.

## Implementation order

Phased so the boring static case lands first; structural dynamics layer on top.

**Phase 1 — value-flow trace (static topology):**
1. Define `Event` struct + `Trace` recorder in Go (~30 lines).
2. Thread `*Trace` through node constructors.
3. Emit `recv` / `fire` / `send` / `state-set` / `latch-*` events.
4. Add `--trace=PATH` flag to `main.go` / `cmd/topogen`; dump JSON-lines.
5. Webview: trace loader; step-indexed player driving existing animations.
6. Player UI: play / pause / step / scrub / speed.

**Phase 2 — live stream + tests:**
7. Wire `topogend` to stream events over websocket; webview "live" mode.
8. Trace assertions as Go tests over the event list.

**Phase 3 — structural events:**
9. Extend `Event` with structural fields and add the structural kinds to
   the closed vocabulary.
10. Viewer: maintain mutable graph state; apply structural events.
11. Viewer: tween node positions on `node-move`; reveal/fade nodes and
    edges on add/remove; re-route edges on `edge-rewire`.
12. Add the first Go-side dynamic — e.g. a lateral-inhibition rule that
    drops an edge — and confirm the viewer replays it correctly.

**Phase 4 — when needed:**
13. Re-evaluate custom renderer vs Cytoscape.js / React Flow once
    structural dynamics are real and the routing/tweening pain is
    concrete.
14. If/when continuous spatial state matters (smooth particle motion
    rather than discrete moves), add a `snapshot` event kind carrying
    interpolatable state.

Phases 1–2 are the unlock. Phase 3 is what enables the 2D+time vision.
Phase 4 is contingency.

## What this kills

- Hand-authored `timing.steps` and SVG/webview cycle-length drift
  (16.902s vs 27s).
- "Does the diagram match the code?" — non-question; the diagram is the
  code's output.
- The temptation to author motion in the viewer. If you see it move,
  Go did it.
- A class of AI debugging tasks where the model reconciles spec claims
  against runtime behavior. The trace is ground truth.

## What this adds

- A closed event vocabulary as a contract between runtime and viewer.
  Design carefully; extend reluctantly.
- Some runtime overhead (one channel send per interesting event).
  Negligible for this system's scale.
- Trace files as a new artifact. Useful: commit short ones as fixtures.
- Real complexity in the viewer once Phase 3 lands: graph-state
  management, tweening, dynamic routing. Likely the point at which
  adopting an off-the-shelf graph library pays off.

## Why this works for this system specifically

The runtime is discrete and event-driven (channels, gates, latches). Every
interesting moment is already a channel send or a gate firing — the
"what is an event?" question that blocks instrumentation in most systems
is already answered by the topology. Adding structural events is the same
move applied to topology mutations: every rewire / spawn / suppression is
already a discrete decision point in the Go code; instrumenting it is a
one-liner at the call site.
