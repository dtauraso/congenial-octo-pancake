# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

---

Continuing on wirefold, branch `task/in0-readgate-emission-ack`.
Working tree clean except for the long-standing `topology.view.json`
modification carried across branches.

State at handoff:
  Tests 227/227, tsc/check:loc/build all clean. Branch is several
  commits ahead of main; pushed. **NOT yet ready to merge** — the
  in0 label-value issue is still open (see below). One small
  refactor landed this session as scaffolding for the fix.

What landed this session:

  1. **Architectural reframe of the in0 label-value bug.** The prior
     handoff framed the fix as "option A (buffer suppressed in0
     notifies)" or "option B (cluster-buffered cycles, sim headless,
     visual replay)." A planning pass on B produced a global
     scheduler design with 5 policy forks (cluster boundary, buffer
     depth, attribution, etc.). User pushed back: "too much focus on
     being clever with global control — the TS needs to recreate the
     logic Go intended to do."

     **The substrate-correct fix:** in Go, a goroutine emitting on a
     full channel *blocks the sender* — data isn't dropped, it sits
     at the source until the channel accepts it. The TS bug exists
     because emit.ts *drops* sim notifies for v=1, v=2 when cadence
     is awaiting, instead of *holding the source* the way a blocked
     Go sender would.

     **Local fix, no buffer, no scheduler, no clusters:** the
     sim-side seed advance for a cadenced source is itself gated by
     the cadence latch. When cadence is awaiting, in08 does not
     take the next value from its seed `[0,1,0]` — it stalls. When
     cadence clears, in08 advances, emits v=1 with its real value,
     cadence re-arms, repeat.

     C10 latch stays as-is; it just becomes the gate the *seed read*
     consults, not a thing that suppresses notifies after the fact.
     Options A and B from the previous handoff are both abandoned.
     The 5 forks dissolve.

  2. **Chunk 1 of the now-abandoned cluster-buffer plan still
     landed** as `e35efaf` — `refactor(emit): extract dispatch
     indirection`. Pure refactor: every `notify(...)` call in
     `emitEvents` now goes through a local `dispatch()` helper. Zero
     behavior change, 227/227 green. **It is also useful for the
     reframed approach** as a single hook point if needed later;
     does not need to be reverted.

Open issue (reframed): in0 label value is always 0.
  in08 has `data.init: [0, 1, 0]`. Visually every in0 pulse shows
  `value=0` because emit.ts drops sim notifies for v=1 and v=2 while
  cadence is awaiting, then cycle-restart re-seeds and v=0 fires
  again.

  **Next implementation step (not yet planned in detail):**
    Locate where seed values are drained into the sim for Input
    nodes (likely simulator.ts or the Input handler). For sources
    where `cadence.isCadenced(sourceId)` is true, gate the seed
    advance on `cadence.mayEmit(sourceId)`. When `mayEmit` is false,
    the source does not consume its next seed value — it waits.
    When the cadence two-leg condition fires (existing C10 path),
    `mayEmit` flips true and the next seed value enters the sim.

  Then the suppression code in emit.ts becomes redundant (the sim
  never produces a notify that needs to be suppressed) and can be
  removed. Net: cadence becomes Go-channel-shaped — back-pressure at
  the source, not drop-on-the-wire.

  Contract: extend or replace C10's integration test to assert that
  given seed `[0,1,0]` and a cadence rule, three sim-accepted inputs
  produce three notifies with values [0,1,0] in order, paced by the
  visible cadence cycle.

Cadence layer guidance for next inhabitant (still active):
  - Module shape established by `in0ReadGateAck.ts`: module-scope
    `Map`-keyed registry + `awaiting` latch state. `resetCadence()`
    on lifecycle boundaries (load, replay-restart, at-rest play).
    Cycle-restart deliberately does NOT reset (visual pacing
    persists across sim restarts).
  - `signalPulseComplete(edgeId, fromNodeId)` is the single renderer
    hook. Both legs of every registered latch dispatch through it.
  - Adding a new cadence rule = add an entry to `spec.cadenceAcks`.
    No code change required for a same-shape rule.

Substrate working mode (carried forward, REINFORCED this session):
  The user articulated, at length, why this work is substrate-shaped
  (topology-as-logic, multi-scale timing, discrete causal sims) and
  why AI-shaped niche menus produce flat application-layer framings
  that miss the substrate. **This session demonstrated the failure
  mode in practice:** the assistant produced a 10-chunk global-
  scheduler plan with 5 policy forks before the user named the
  reframe. Lessons reinforced:
    - **Don't propose niche bundles.** User-named frames stand alone.
    - **Don't offer "next options" menus proactively.** Wait for the
      user to name the next frame.
    - **When designing fixes, first ask: what does the Go side do?**
      The TS visual layer should re-create Go semantics, not invent
      its own global control. Channels back-pressure locally; gates
      back-pressure locally; Inputs should back-pressure locally.
    - **Global schedulers are a smell.** If a fix needs a central
      coordinator, central buffer, or central policy knob, the
      framing is probably wrong.
    - **Use Claude Code as a fabricator, not a co-designer.**

Lessons from this session worth carrying:
  - **Plan-before-execute saved cost here, but only because the user
    rejected the plan.** The 10-chunk option-B plan would have been
    expensive to half-build before reframing. Future: when a plan
    grows policy forks or a global coordinator, surface that shape
    *to the user* before drafting chunks — it's a signal the framing
    may be off.
  - **Per-edit chunk gating works well.** User asked for "plan first
    then sign off, one at a time." Chunk 1 landed cleanly under that
    discipline. Continue.

Contract registry status (docs/planning/visual-editor/contracts.md):
  C6 ✅ pulse-lifetime-view-agnostic.
  C7 ✅ renderer-or-timer race for pulse completion.
  C8 ✅ visual concurrency cap doesn't desynchronise lifecycle ledger.
  C9 ✅ uniform pulse speed across emitter types.
  C10 ✅ spec-derived cadence back-pressure (will be extended/refined
      when the seed-gating fix lands; semantics shift from "suppress
      sim notify" to "gate seed advance" but the latch is unchanged).

Probe instrumentation (carried forward, still active):
  - `.probe/stuck-pulse-last.json` / `-followup.json` / `-third.json`.
  - `RunnerProbe` toolbar latches `⚠ stuck-anim` / `⚠ stuck-pending`.
  - `window.__resetPulseLeak()` re-arms the one-shot.
  - `.probe/timeline-last.json` invaluable for diagnosing per-edge
    emit/anim-start/anim-end sequences with values.

Open branches:
  - `task/in0-readgate-emission-ack` — current, pushed. **Do not
    merge** until the seed-gating fix lands and user signs off.

Branch hygiene: no merge to main without explicit sign-off. Delete merged branches without re-asking. Force-push needs sign-off.
Cwd for tsc/tests/check:loc/build: tools/topology-vscode/ (Bash resets cwd — chain cd or use absolute paths).
Stop hook active: scripts/stop-checks.sh runs go build / tsc / check:loc / npm run build on relevant changes and blocks stop on failure.
If user surfaces unrelated friction, log to docs/planning/visual-editor/session-log.md and open a fresh task/<short-kebab>.

ALWAYS — at end of session, overwrite docs/planning/visual-editor/handoff.md with a freshly-rendered prompt tailored to the state you're leaving the branch in, and commit it on the task branch. Do not rely on chat history; the next AI may be a fresh model with no transcript. The rendered handoff must itself contain this same ALWAYS clause so the loop is self-perpetuating across sessions. Use docs/planning/visual-editor/continuation-prompt-template.md as the structural source of truth; update the template when an invariant changes.
