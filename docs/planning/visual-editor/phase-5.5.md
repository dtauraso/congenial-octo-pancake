# Phase 5.5 — animation model rewrite (simulator + per-node tickers)

**Cap:** ~2 (risk to ~3). **$ extra-usage est:** ~$120 (range $60–$200, 1× mixed); risk-case ~$180 (up to ~$300). ⏳

Replaces the current `timing.steps[]`-driven master playback clock — an SVG-era artifact whose position/timing coupling forced a script recompute on every layout edit and was a major past cap-hit sink. Also clarifies how Phases 6 and 7 land. Must ship before Phase 6 (keyframed motion) starts.

*Goal:* animation behavior emerges from the topology + per-node response rules, the way it does in the running Go system. Spec edits never touch a global script. Position is independent of timing.

## Components

- **Per-node response rules (props/handlers).** Each node-type registry entry declares a per-input handler ("when a pulse arrives on `in`, fire and emit on `out` after delay D"). Per-instance config (`AndGate.inputCount`, `Latch.delay`) lives on `spec.nodes[i].props`. Response rules + props are the only authority for what fires when. `timing.steps[]` is removed from the spec or kept only as an *initial seed* (a small list of `(port, t0, value)` tuples that kick off the simulation).
- **Simulator.** Pure module that, given (spec, optional seed, current world-state), advances the simulation by one event: pop one ready input, run the receiver's handler, emit pulses on outputs into in-flight queues. Deterministic given a tie-break rule (e.g., FIFO by event-arrival id). Independent of the renderer.
- **N1' — concurrency reveal mode (auto-detected concurrent edges).** Edges flagged "concurrent" run a self-pacing pulse loop: pulse N+1 leaves the source when pulse N arrives at the target. Rate emerges from edge traversal time, so faster edges visibly cycle faster — surfaces *which parts of the graph run in parallel and how their natural rhythms relate*. Concurrent edges are detected automatically by analyzing the per-node handlers + edge graph: an edge is concurrent if its source's firing isn't gated by another edge that's gated upstream (no AND/sync ancestor). This needs the per-node handler formalism to land first; manual override flag (`edge.concurrent: true`) is the fallback if auto-detection turns out unreliable in practice.
- **N2 — step-debugger.** Per-node play / pause / step. Step = process one input pulse (fire + emit). Play = step on a wall-clock interval (e.g. 200ms). Pulses-in-flight pause when their source pauses. Multiple nodes can play concurrently. Visualized as per-node pause/play affordances in the corner of each `AnimatedNode`.

## What gets gutted from the existing system

- **Master playback clock** (`playback.ts`) — removed. Per-node tickers replace it.
- **Global timeline scrubber** — removed (no global `t` to scrub).
- **Bookmarks-at-t** — replaced with **resumption-coordinate bookmarks**. Each bookmark is `{name, startNodeId, cycle}` (one node per bookmark; multi-node ignition is "activate two bookmarks at once" via shift-click, not a list field on a single bookmark). Clicking a bookmark fast-forwards the simulator to `cycle = Y` with `startNodeId` as the active node, then hands off to N2 (play / pause / step from there). Cycle definition: **anchor-fire (ii-b)** — `spec.cycleAnchor: nodeId` declares one node as the cycle counter; cycle increments each time the anchor fires. Default if `cycleAnchor` is unset: **(ii-a) quiescent-input** — cycle increments each time the simulator drains one input value and returns to a no-in-flight state. Fast-forward strategy: **F1 deterministic replay** (simulator re-runs cycle 0 → Y silently, then UI takes over). No snapshot storage. F2 (memoized snapshots every N cycles) only added if F1 turns out slow in practice for real topology sizes.
- **`timing.steps[]` in the spec** — removed (or reduced to seed-only).

## What survives unchanged

- Per-node flash + state-text animations — become one-shot, event-triggered (fire-on-handler-fire) instead of clock-subscribed.
- Edge pulse traversal — one-shot per pulse event. Concurrent edges are just continuous re-triggers of the same primitive.
- `▶ run` / build pipeline.
- Spec/viewer split, sidecar, codegen pipeline, fold/saved-view machinery.

## Dependencies created

- **Phase 6 (keyframed motion):** rebudget after this lands. *Real* node motion (a partition node sliding) becomes a node-prop the simulator reads; pure-presentation animation lives on viewer state. Probably *cheaper* than current ~2.5 estimate because the spec/viewer split for keyframes becomes mechanical.
- **Phase 7 (trace replay):** clarifies materially. A trace from the running Go is structurally `(node, event-type, value, ordinal)` tuples — directly comparable against simulator output. "Drift" is well-defined.
- **`.diff-reconfigured`** for Phase 5: only meaningful once `props` exist. Add to Phase 5 vocabulary as a follow-up after this phase ships.

## Risk

The per-node handler formalism is the load-bearing piece. If handlers aren't expressive enough, real Go behaviors won't be reproducible in the simulator and N1' / N2 give a false picture. Seed handler set should cover the existing `NODE_TYPES` registry; expand only as new node-types are added. Keep handlers as small, pure `(state, input) → (state', emissions)` functions — same shape Redux reducers / React `useReducer` use, same property: easy to test in isolation.

## Estimate breakdown

Response-rule formalism + seed handlers (~½), simulator core + tie-break + tests (~½), N2 per-node UI controls + event-triggered animation rewrite (~½), N1' auto-detection + self-pacing edge loop (~½). Total ~2 caps; risk to ~3 if auto-detection turns flaky and we have to fall back to manual flags + UX for setting them.

## Actuals

Shipped in four commits on `visual-editor`:

| Chunk | Commit | $ | vs est |
|---|---|---|---|
| A — handler-registry + props schema | `7e1816e` | $2.63 | $5 est, $9 risk |
| B — pure simulator | `26023b9` | $1.49 | $6 est, $12 risk |
| C — runner + event-driven render | `ba41e2d` | $7.52 | $5 est, $9 risk |
| D — step-debugger + bookmarks + steps[] removal | (pending) | $8.28 | $4 est, $5 risk (over) |

**Note from Chunk C runtime:** the per-event 200ms tick can feel uneven on chains where some handlers fire instantly and others wait on a join — the visible cadence is the *event* rate, not a uniform clock. Chunk D added a tick-speed slider (60–1500ms) so users can pace it. The auto-reseed on quiescence pauses for one tick before re-firing, which is also user-visible as a beat.

**Visual cadence note (carry into N1' follow-up).** The tick-speed slider paces wall-clock time *between* `step()` calls, but a single step can fan into multiple downstream emissions that all flash on the next tick — so chains where one node fans out to several look jumpy at low tick intervals. Polish idea for follow-up: enforce a minimum wall delay per *event* (not per step) by buffering emissions onto a per-edge queue with paced flushes. Out of scope for the N1' concurrency work but adjacent.

**N1' deferred to Phase 5.5 follow-up.** The N2 step-debugger + bookmark UI absorbed Chunk D's budget; the concurrency-reveal mode (auto-detect + self-pacing edge loop) is a self-contained next bite. The hooks are in place — `runner.subscribe` already publishes `EmitEvent` per edge, and adding a "concurrent-edge" set + a re-emission scheduler is the missing piece. Estimated ~$2 follow-up. Manual `edge.concurrent: true` override should land at the same time as the fallback.
