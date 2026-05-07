# Handoff — Step 1 build notes (decision audit)

Initial sketch was a standalone HTML at
`docs/planning/sim-substrate/chan-wire-driven.html` driven by an
embedded topology snapshot. User flagged this as "test on HTML, then
test in RF" double-build — corrected to land directly in the editor
webview. The standalone HTML was deleted before commit. Lesson: the
chan sketches were standalone *because they were specs*; step 1 is
the renderer, which lives next to the mess it replaces. Future port
steps should default to "in the editor" unless there's a reason
otherwise.

Substrate plugs into the existing event-bus by emitting `EmitEvent`
(same shape the legacy runner emits), so AnimatedEdge renders
unchanged. **As of d2f36c1**, the substrate is ack-driven: the bus
carries a new `PulseAckEvent` that AnimatedEdge fires from
`advanceLane0/1` when a pulse finishes traversing, and the substrate
emits the next token on receipt. No timer. This was pulled forward
from step 3 (originally an R1 FIFO concern) because the timer-based
interval was visibly dropping every other token at cap=1.

## Coupling hacks gated to step-1 (commits e0ef402, d2f36c1)

The substrate piggybacks on three pieces of legacy-runner state that
must come out as the rebuild matures. Search `// Step 1` /
`legacyRunnerState` / `_resetPulseConcurrency` to find them. Each is
load-bearing for visible animation in the current shape:

  1. ~~`_resetPulseConcurrency()` on loadSubstrate~~ — retired in
     commit 3921640 (revised step 1, commit 5). The matched path runs
     through runtime-wires.ts (no ledger coupling), so the defensive
     reset in legacy loadSubstrate was no longer needed.
  2. `legacyRunnerState.playing = true` on loadSubstrate —
     PulseInstance.tsx:76 gates its rAF on `isPlaying()`, which
     reads `state.playing`. Without this, pulses mount but never
     animate, never call `onDone`, slot stays held, every subsequent
     emit gets `ae-rejected`. Step 3+ replaces with a substrate-
     owned animation contract.
  3. `pauseRunner()` on substrate-match — halts legacy ticker so it
     doesn't compete. Comes out when legacy runner is fully retired.
  4. `PulseAckEvent` on the shared event-bus + AnimatedEdge calling
     `notify({type:"pulse-ack",...})` from `advanceLane0/1`. NOT a
     hack — this is the correct cap=0 contract — but it's a new
     load-bearing dependency the substrate has on AnimatedEdge's
     completion path. Survives past step 1; documented here so the
     coupling is visible.

These are the load-bearing bits of the legacy coupling. Anything
else legacy-shaped that the substrate ends up depending on should be
added to this list at the same time it's introduced.

## Automated logging

`.probe/substrate-log.jsonl` captures every substrate event (match,
loaded, emit, ae-subscribed, ae-received, ae-rejected, ae-mounting)
with `{ts, label, data}` per line. Webview's `slog()` posts to
extension; extension `appendSubstrateLog` writes via `fs.appendFile`
with a promise queue (vscode.workspace.fs read-then-write races on
bursty per-emit traffic). To debug: `rm .probe/substrate-log.jsonl`,
reload editor, read the file. Step 6 deletes alongside other probes.

## Playwright e2e

`tools/topology-vscode/e2e/substrate-step1.spec.ts` asserts in the
harness that match → loaded → emit → AnimatedEdge subscribes →
PulseInstance mounts a `data-testid="pulse"` path. Run with
`npx playwright test substrate-step1`. ~3s. NOTE: the harness does
NOT reproduce real-VS-Code behavior fully — the bug that broke
visible animation passed in the harness because the harness happens
to land in a state where the legacy `state.playing` flag is true.
Treat green harness as necessary-not-sufficient for "step 1 works."
Real-editor verification (reload + read substrate-log.jsonl + see
tokens) remains the truth.
