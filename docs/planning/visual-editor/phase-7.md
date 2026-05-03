# Phase 7 — trace replay rejoins the pipeline

Closes the runtime → viewer loop. Go runtime emits a value-flow trace;
TS viewer replays it and renders drift against the simulator's own
output. See [trace-replay-plan.md](../trace-replay-plan.md) for the
deeper design.

## Decisions (Phase 7 proposal, signed off 2026-05-03)

- **TS-first ordering.** The simulator authors the wire format; Go
  instrumentation conforms later. Justification: Go-side emission is
  mechanical once the contract is locked, and the simulator's
  `world.history` projection is already the correctness oracle.
- **Wire format: JSON-lines** (`*.trace.jsonl`). Closed vocabulary
  validated at parse time. Chosen over protobuf (binary, opaque in
  PRs), sqlite (random-access we don't need), and OpenTelemetry
  (span-model assumes timestamps; we have none).
- **No `state-set` events.** Phase 6 derives motion from re-running
  TS handlers on replay, so Go doesn't need to expose handler state.
  If Go ever gains state worth emitting (per trace-replay-plan §3),
  add the kind then.
- **Drift definition.** Trace and simulator agree iff their event
  sequences are equal under the projection
  `(kind, node|edge, port?, value?)` — same length, same per-index
  match. `step`/`tick`/`cycle` are excluded from drift. Anchor-fire
  counts are validated separately.

## Chunks

- **Chunk 1 — TS contract + fixture replay (DONE, `d371f2e`, $2.11).**
  `src/sim/trace.ts`: `TraceEvent` (recv|fire|send), JSONL
  parser/serializer, `historyToTrace`. `src/sim/runner.ts`:
  `loadTrace()` / `isReplaying()` driving the EventBus from a recorded
  event list, re-running handlers on `recv` so `world.state.dx/dy`
  stays correct. Committed fixture `chain-cascade.trace.jsonl` is
  pinned by a test. No UI surface yet.

- **Chunk 2 — drift indicator + load-trace UI (DONE, `ebc6fe5`, $2.82).**
  `src/sim/drift.ts`: pure projection comparator. Webview gains a
  "load trace" button that opens a `*.trace.jsonl`, switches the
  runner into replay mode, runs the simulator silently to project
  history, and reports drift in the timeline status bar. Schema
  bugfix on the side: `parseEdge` was dropping the `concurrent`
  override, breaking the runner-play-pause e2e via the N1' loop.
  Two-pane diagram **dropped from scope** — see "Two-pane: dropped"
  below.

- **Chunk 3 — Go: Trace recorder + value-flow emission** ⏳.
  `Trace` struct + drain goroutine + JSONL writer. Thread `*Trace`
  through node constructors. Emit `recv` / `fire` / `send` at known
  call sites (handler entry, gate fires, channel sends). Largest
  unknown — first non-codegen edits to `Wiring.go`.

- **Chunk 4 — Go: `--trace` flag + parity test** ⏳.
  `cmd/topogen --trace=PATH`. Integration test runs the same fixture
  spec through Go and asserts the emitted trace passes the projection
  match against `chain-cascade.trace.jsonl` (same fixture pinned in
  Chunk 1).

- **Chunk 5 — Tier 2 test** ⏳. `JSON.stringify(spec)` is byte-
  identical before/after a `loadTrace + step-to-end` cycle. Promotes
  the rule "trace is observation, spec is design" from doc to test.
  Tier 3 side-by-side scrubbing-independence test is removed along
  with two-pane.

## Two-pane: dropped

Original Chunk 2 plan was a literal two-pane viewer (left = simulator,
right = trace replay) so divergence would be visible at the *node*
level on the diagram. We dropped this after recognizing that drift
should be mechanically impossible if the TS handler library mirrors
the Go nodes correctly. The only legitimate drift sources are:

1. **Concurrent interleaving** — Go's scheduler picks a real
   interleaving from many legal ones; the TS simulator is
   deterministic FIFO. Both executions are correct; the orderings
   just differ. Not a bug.
2. **Handler-registry rot** — a Go node's behavior changed without
   the matching TS handler being updated (or vice versa). Real bug,
   but rare and caught by the status-line drift indicator.

Two-pane was solving for an everyday visual debugging surface for a
problem (sim vs Go disagreement) that should rarely occur. The
status-line indicator from Chunk 2 is the right amount of UI for an
event that signals handler-library maintenance, not runtime bugs.

The primary value of trace replay is **the trace IS the ground truth
of a Go run** — the editor becomes a player for "what actually
happened" instead of a hand-authored cartoon. Drift detection is a
side benefit. That value lands in Chunks 3–4 (Go emission), not in a
two-pane visualization.

## Recalibrated estimate

Original proposal anchored on $/cap heuristics that don't match Phase
5.5 / Phase 6 actuals. Chunk 1's $2.11 sits inside the Phase 6 band
($1.17–$2.50). Revising downward, with caveat that Go chunks are
unprecedented in this codebase.

| Chunk | Scope | Revised est | Range |
|---|---|---|---|
| 1 | TS trace contract + replay path | done | $2.11 actual |
| 2 | Drift indicator + load-trace UI | done | $2.82 actual |
| 3 | Go Trace recorder + Wiring.go emission | $10 | $5–20 |
| 4 | Go `--trace` flag + parity test | $4 | $2–8 |
| 5 | Tier 2 test | $1 | $0.50–2 |
| **Total** | | **~$20** | **$10–37** |

Down from original $315. Phase 5.5 / Phase 6 averages ($1.68–$4.25
per chunk) are the better prior than the original cap-rate model.
Go chunks (3, 4) carry a wider band because they touch unfamiliar
territory; if Chunk 3 actually lands closer to $20 we recalibrate
again before Chunk 4.

## Actuals

| Chunk | Commit | $ | vs revised est |
|---|---|---|---|
| 1 — TS trace contract + replay path | `d371f2e` | $2.11 | $65 orig est (way over); fits Phase 6 band |
| 2 — Drift indicator + load-trace UI | `ebc6fe5` | $2.82 | $5 revised est, on-target |
| 3 — Go Trace recorder + emit sites | `a6f298a` | $4.48 | $10 revised est, well under |
| 4 — `--trace` flag + parity test + resolver | `49288a5` | $2.16 | $4 revised est, well under |
| 5 — Tier 2 spec-immutability test | `f80248b` | TBD | $1 revised est |
| **Phase 7 total (chunks 1–5)** | | **$11.57 + ch5** | **$20 revised est** |

### Phase 8 (per-node Go ↔ TS parity) — running tally

Tracked here because Phase 8 in [phase-8.md](phase-8.md) is the
unrelated "polish" phase (undo/redo, snap-to-grid). The parity work
grew out of Phase 7's drift-indicator surface and lives next to its
actuals.

| Chunk | Commit | $ | est |
|---|---|---|---|
| 1 — AndGate Go node + parity | `fd4a91e` | $1.58 | — |
| 2 — StreakDetector Go node + parity | `c275666` | $0.61 | — |
| 3 — StreakBreakDetector Go node + parity | `75ce915` | $0.35 | — |
| 4 — ReadGate parity (no new Go node) | `e90d55e` | $0.87 | — |
| 5 — SyncGate Go node + parity | `1875fbc` | $0.40 | — |
| 6 — Partition Go rewrite + parity | `cde5d1c` | $0.96 | — |
| 7 — InhibitRightGate parity (no new Go node) | `138fd28` | $0.73 | — |
| 8 — EdgeNode Go rewrite + parity | (this commit) | $0.99 | $1.75 est, under |
| **Phase 8 chunks 1–8 total** | | **$6.49** | **$5–15 original band** |

**Chunk 8 — EdgeNode** (proposal signed off 2026-05-03):

- **Scope:** EdgeNode only. DistributeNode deferred — its Go node is a
  print-only stub with one input and zero outputs, so there is no
  behavior to mirror; defining TS semantics is a design call for a
  separate session.
- **TS port shape:** inputs `left` / `right` (kind `inhibit-in`); three
  outputs `outInhibitor` / `outPartition` / `outNextEdge` (kind
  `signal`), all carrying the same XOR result. Mirrors the Go node's
  three `S.Send` calls so trace parity is per-edge. The unused
  `FromPrevEdge` input on the Go side is dropped from both sides —
  pure dead code today; re-add when it gains meaning.
- **Deliverables:** `NODE_TYPES.EdgeNode` in
  `tools/topology-vscode/src/schema.ts`; `edgeJoin` handler +
  registration + `GATE_TYPES` entry in
  `tools/topology-vscode/src/sim/handlers.ts`; committed fixture
  `tools/topology-vscode/test/fixtures/edge-node.trace.jsonl`;
  rewrite `EdgeNode/EdgeNode.go` to the parity-chunk shape (`Name`,
  named channels, `*Trace` via `S.SafeWorker`, no prints); add
  `Trace/FixtureParity_EdgeNode_test.go` modeled on
  `FixtureParity_AndGate_test.go`.
- **Verify:** `npx tsc --noEmit && npm test` from
  `tools/topology-vscode/`; `go build ./... && go test ./...` from
  repo root.
- **Estimate:** $1.75 (range $1.20–$3.00). Larger than the
  single-language chunks because it's TS + Go in one chunk with a
  3-output fan-out; still well under the original $5–15 Phase 8 band.
