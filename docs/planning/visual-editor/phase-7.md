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

- **Chunk 2 — side-by-side spec-sim vs trace-replay UI** ⏳.
  Two-pane viewer: left runs the live simulator, right replays a
  loaded trace. Independent step/play controls per pane. Drift
  indicator computes the §Decisions projection on each event and
  highlights the first divergent index. "Load trace" command on the
  webview that calls `runner.loadTrace`.

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

- **Chunk 5 — Tier 2/3 tests** ⏳. Tier 2: `JSON.stringify(spec)` is
  byte-identical before/after a `loadTrace + step-to-end` cycle.
  Tier 3: scrubbing one side-by-side pane doesn't move the other,
  but bookmarks are jumpable from either pane.

## Recalibrated estimate

Original proposal anchored on $/cap heuristics that don't match Phase
5.5 / Phase 6 actuals. Chunk 1's $2.11 sits inside the Phase 6 band
($1.17–$2.50). Revising downward, with caveat that Go chunks are
unprecedented in this codebase.

| Chunk | Scope | Revised est | Range |
|---|---|---|---|
| 1 | TS trace contract + replay path | done | $2.11 actual |
| 2 | Side-by-side UI + drift indicator | $5 | $3–10 |
| 3 | Go Trace recorder + Wiring.go emission | $10 | $5–20 |
| 4 | Go `--trace` flag + parity test | $4 | $2–8 |
| 5 | Tier 2/3 tests | $2 | $1–4 |
| **Total** | | **~$23** | **$13–44** |

Down from original $315. Phase 5.5 / Phase 6 averages ($1.68–$4.25
per chunk) are the better prior than the original cap-rate model.
Go chunks (3, 4) carry a wider band because they touch unfamiliar
territory; if Chunk 3 actually lands closer to $20 we recalibrate
again before Chunk 4.

## Actuals

| Chunk | Commit | $ | vs revised est |
|---|---|---|---|
| 1 — TS trace contract + replay path | `d371f2e` | $2.11 | $65 orig est (way over); fits Phase 6 band |
