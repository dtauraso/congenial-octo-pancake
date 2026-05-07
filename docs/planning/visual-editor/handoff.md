# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

---

Continuing on wirefold, branch `task/runtime-substrate-rebuild` (off
`main`, pushed). Gate A passed; this is the rebuild branch. Port-plan
**step 1 is done AND visibly animates** in the real VS Code extension
— tokens 0/1/0 from `data.init` traverse the chan→wire end-to-end,
**ack-driven** (cap=0 unbuffered: each emit waits for the previous
pulse to finish traversing). Verified by user 2026-05-07. Next work
is a **step-1 follow-up: fix the play/pause toolbar button** before
starting step 2.

State at handoff:
  Local on `task/runtime-substrate-rebuild`, pushed to origin.
  Working tree has `topology.view.json` modified (incidental editor
  pan/zoom; not part of rebuild work — leave or discard, do not
  commit).
  Tests/build/tsc/check:loc clean. Last verified 218/218 vitest +
  Playwright `substrate-step1` green at d2f36c1 (ack-driven emit).

## Step 1 build notes (decision audit)

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

### Coupling hacks gated to step-1 (commits e0ef402, d2f36c1)

The substrate piggybacks on three pieces of legacy-runner state that
must come out as the rebuild matures. Search `// Step 1` /
`legacyRunnerState` / `_resetPulseConcurrency` to find them. Each is
load-bearing for visible animation in the current shape:

  1. `_resetPulseConcurrency()` on loadSubstrate — clears the
     visual-slot ledger that legacy probe machinery dirties. Removed
     in step 6 alongside the rest of the probes.
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

### Automated logging

`.probe/substrate-log.jsonl` captures every substrate event (match,
loaded, emit, ae-subscribed, ae-received, ae-rejected, ae-mounting)
with `{ts, label, data}` per line. Webview's `slog()` posts to
extension; extension `appendSubstrateLog` writes via `fs.appendFile`
with a promise queue (vscode.workspace.fs read-then-write races on
bursty per-emit traffic). To debug: `rm .probe/substrate-log.jsonl`,
reload editor, read the file. Step 6 deletes alongside other probes.

### Playwright e2e

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

## What just landed (Gate A pass)

`task/sim-substrate-sketches` merged to `main` at fbaaa2a and was
deleted (local + remote). The merge brought:
  - chan sketches (anim + wire) at
    [../sim-substrate/chan-anim.html](../sim-substrate/chan-anim.html)
    and [../sim-substrate/chan-wire.html](../sim-substrate/chan-wire.html).
  - Tabbed [index.html](../sim-substrate/index.html).
  - Pre-rebuild topology archived at
    [../sim-substrate/topology-pre-rebuild.json](../sim-substrate/topology-pre-rebuild.json)
    and [.view.json](../sim-substrate/topology-pre-rebuild.view.json).
  - Repo-root `topology.json` + `topology.view.json` swapped to a
    2-node `in08 → readGate1` pair (does not animate; intentional).
  - C6–C8 in [contracts.md](contracts.md) marked **OBSOLETE**.
  - [rebuild-plan.md](../sim-substrate/rebuild-plan.md) — the spec
    for this branch.

Gate A revisions made before merge: corrected lowest-index
attribution (came from the dropped select sketch, not chan); flagged
per-node running indicator as prose-only spec until port step 2;
clarified R5 does not forbid sub-frame tweening; deferred
buffered-vs-unbuffered decision to port step 1.

## Next task — START HERE

**Step-1 follow-up: fix the play/pause toolbar button under the
substrate path.** The button currently calls into `sim/runner`'s
`play()`/`pause()`. Step 1 hijacks `legacyRunnerState.playing` and
calls `pauseRunner()` on substrate-match, so the toolbar button now
either no-ops (no spec loaded in legacy runner) or fights the
substrate's own state.

Note (post-d2f36c1): the substrate is now ack-driven, so "pause"
means *don't emit the next token on receipt of the next ack*, and
*also halt the in-flight pulse animation*. Pausing the in-flight
pulse may need to plug into the existing `pauseAllPulseTimers` /
`resumeAllPulseTimers` (sim/runner/pulse-completion) so the visible
arc freezes. This is shoe-horn-able into option (b) below.

**Surfaced friction (2026-05-07):** user reports "play/pause has a
new bug" after step 1 wire-animation fix landed. Tokens animate
correctly in auto-run, but the toolbar control is broken. Logging
this here per the post-v0 friction-driven posture (CLAUDE.md).

What "fixed" looks like:
  - With the 2-node topology loaded, pressing pause halts token
    emission AND halts the in-flight pulse animation.
  - Pressing play resumes both.
  - Reset (existing behavior) re-arms the input queue.
  - Behavior should match the chan-wire.html sketch's intuition.

Concrete scope candidates (Opus call, then sonnet edits):
  (a) Make substrate own its own play/pause flag. Toolbar reads
      from substrate when matched, legacy runner otherwise.
      Decoupling move — likely correct but bigger.
  (b) Have substrate mirror its play state into
      `legacyRunnerState.playing` (already half-doing this) and
      route toolbar's play/pause through a thin shim that toggles
      both substrate's setInterval AND the flag. Smaller, keeps
      step-1 hack shape.
  (c) Defer play/pause until step 3's R1 contract test forces a
      cleaner animation contract. Skip for now.

Recommendation: (b) for this commit (cheapest, preserves the
gated-hacks discipline in step 1 build notes), upgrade to (a) at
step 3 when the substrate contract is being written anyway.

Budget: ~$10. Same hard cap and reassess discipline (below).

After this lands, then port-plan step 2 (per-node running indicator
+ reloop glyph). Spec at
[../sim-substrate/rebuild-plan.md](../sim-substrate/rebuild-plan.md)
§"Visual layer" item 2. Do not start it before play/pause works —
the running indicator needs play/pause to be debuggable.

Do **not** combine the play/pause fix with step 2 in one commit.
One concern per commit per the plan doc.

## Hard cap and reassess trigger (carried forward from step 1)

Each port-plan step gets a per-step hard cap (default $25 unless
stated otherwise). If a step has not produced its working
deliverable by the cap, stop and reassess: write a one-paragraph
note in [../sim-substrate/rebuild-plan.md](../sim-substrate/rebuild-plan.md)
naming which assumption broke (renderer location? buffered model?
topology shape? something else?), and surface to the user before
spending more. The point is to find substrate-design problems
cheaply at the current step rather than later after more code has
piled on top. Sunk-cost reasoning is the failure mode this cap
defends against — do not raise the cap mid-spiral without explicit
user sign-off.

## Rebuild plan summary (carried forward)

Visual primitives:
  1. **chan → wire.** Spec'd by chan sketches.
  2. **Per-node running indicator (with reloop).** Prose spec only;
     drawn for the first time in port step 2.

Semantic contracts (Go-side tests under `internal/substrate/contracts/`
or equivalent):
  - **R1** Channel FIFO.
  - **R2** Select determinism = lowest-index.
  - **R3** Scheduler determinism (byte-identical state given same
    inputs).
  - **R4** No goroutine runs twice per step.
  - **R5** Animation step = state transition (sub-frame tweening of
    in-flight position OK; endpoints are the transitions).

Port plan steps:
  1. Chan→wire renderer + trivial two-node topology. ← **next**
  2. Per-node running indicator + reloop glyph.
  3. R1–R5 contract tests (red until substrate satisfies them).
  4. Pilot port: one inhibitor (smallest equivalent).
  5. Bulk port: input sources → latches → inhibitors → detectors →
     gates → partitions.
  6. Delete probe machinery (`.probe/stuck-pulse-last.json` family,
     `.probe/runner-errors-last.json`, `RunnerProbe` toolbar latches,
     `window.__resetPulseLeak`).

## Auto-retire signal for `task/in0-readgate-emission-ack`

Pre-authorised by rebuild-plan.md: delete the parked branch (local
+ remote) on the **first green rebuild contract test** (any of
R1–R5). No re-ask required.

## Conceptual frame (carried forward)

  - **Logic state IS visible state.** No render/logic split. Every
    primitive is specified as visible-state-transition rules; data
    shape is derived from the visual, not the other way around. See
    [memory/feedback_visual_first_default.md](../../../memory/feedback_visual_first_default.md).
  - **The industry's projection bias.** Static abstractions get
    privileged because they're tractable for symbolic reasoners.
    They're lossy compressions of the actual phenomenon. The
    substrate rebuild rejects projection: visuals before logic,
    transitions before snapshots, motion before structure.
  - **Snapshot + motion as a pair.** chan-wire (snapshot) +
    chan-anim (motion).

## Substrate working mode (carried forward)

  - Don't propose niche bundles. User-named frames stand alone.
  - Don't offer "next options" menus proactively. Wait for the user
    to name the next frame.
  - When designing fixes, first ask: what does the Go side do?
    Channels back-pressure locally; gates back-pressure locally.
    Coordinator-shaped fixes are training-data drift.
  - Use Claude Code as a fabricator, not a co-designer.
  - Do not collapse temporal phenomena into static snapshots without
    keeping a separate temporal view alongside.
  See `memory/feedback_substrate_vs_coordinator_bias.md` and
  `memory/feedback_visual_first_default.md`.

## Open branches

  - `main` — production trunk, tip fbaaa2a (Gate A merge).
  - `task/runtime-substrate-rebuild` — this branch. Rebuild work.
  - `task/in0-readgate-emission-ack` — parked at dbab83c. Reference
    for the old shape; **do not merge, do not delete** until first
    green R1–R5 contract test (auto-retire signal).

Branch hygiene: no merge to main without explicit sign-off. Delete merged branches without re-asking. Force-push needs sign-off.
Cwd for tsc/tests/check:loc/build: tools/topology-vscode/ (Bash resets cwd — chain cd or use absolute paths).
Stop hook active: scripts/stop-checks.sh runs go build / tsc / check:loc / npm run build on relevant changes and blocks stop on failure.
If user surfaces unrelated friction, log to docs/planning/visual-editor/session-log.md and open a fresh task/<short-kebab>.

ALWAYS — at end of session, overwrite docs/planning/visual-editor/handoff.md with a freshly-rendered prompt tailored to the state you're leaving the branch in, and commit it on the task branch. Do not rely on chat history; the next AI may be a fresh model with no transcript. The rendered handoff must itself contain this same ALWAYS clause so the loop is self-perpetuating across sessions. Use docs/planning/visual-editor/continuation-prompt-template.md as the structural source of truth; update the template when an invariant changes.
