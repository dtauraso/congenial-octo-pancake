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
  commits ahead of main; pushed; **NOT yet ready to merge** — there's
  a known visual issue (see "Open issue" below).

What landed this session — **spec-derived cadence back-pressure**:

  1. **`spec.cadenceAcks: [{ source, target }]`** — declarative
     back-pressure rule at the spec level. Source = data destination
     ("ack producer"). Target = gated source ("ack consumer"). Tried
     as an `EdgeKind: "cadence-ack"` first, reverted — round-trip
     stripped them and validatePorts collided with input-only nodes.
     Top-level field is cleaner.

  2. **Generic two-leg latch in cadence** ([cadence/in0ReadGateAck.ts](../../tools/topology-vscode/src/cadence/in0ReadGateAck.ts)).
     `buildRegistry(spec)` reads spec.cadenceAcks at load time;
     `mayEmit / markEmitted / signalPulseComplete / resetCadence`.
     Filter-only — never synthesizes pulses. Cadence releases when
     BOTH legs anim-end: the gated source's data pulse arrival AND
     one of the destination's outbound pulses. Whichever leg is
     slower dictates the gate.

  3. **emit.ts suppression** — sim-side notify on the gated source's
     data edge is dropped when cadence is awaiting (the "Go channel
     would have blocked" semantic). PulseInstance fires
     `signalPulseComplete(edgeId, fromNodeId)` from the cleanup with
     `localT >= 1`, dispatching to the cadence latch.

  4. **Contract C10** ([test/contracts/cadence-back-pressure.test.ts](../../tools/topology-vscode/test/contracts/cadence-back-pressure.test.ts)).
     9 tests cover registry build, single-leg insufficient, both-legs
     release in either order, re-arming, malformed spec, and an
     integration test that drives `emitEvents` through the bus and
     asserts suppression matches the latch.

  5. **topology.json migrated** — `cadenceAcks: [{ source: "readGate1",
     target: "in08" }]`. cycle-restart no longer resets cadence
     (visual pacing persists across sim restarts).

Cadence works for **timing** of in0 pulses — they're visibly paced by
the readGate cycle and don't stack. Confirmed by user.

**Open issue: in0 label value is always 0.**
  in08 has `data.init: [0, 1, 0]` — three seed emissions. Visually,
  every in0 pulse shows `value=0`. Diagnosis (timeline log):

  - Sim accepts v=0 → notify v=0 (cadence passes, locks).
  - Sim accepts v=1 → cadence awaiting → notify SUPPRESSED (dropped,
    not buffered).
  - Sim accepts v=2 → notify SUPPRESSED.
  - Sim drains, cycle-restart re-seeds [0,1,0], next cycle's v=0
    becomes the next visible pulse. v=1 and v=2 are gone for that
    cycle.

  Two paths forward, not yet decided:

  A. **Small fix — buffer suppressed in0 notifies.** When emit.ts
     would suppress, push to a per-source notify queue. When cadence
     clears, pop and dispatch with the original value. **Caveat:**
     the readGate output side has the same problem — visual cap=1
     drops v=1 and v=2 outputs. So buffering in0 alone gives
     "in0(0) + output(0) + in0(1) + no output + in0(2) + no output"
     which is half-coherent and may look worse than now. Not
     recommended.

  B. **Full fix — cluster-buffered cycles.** Each sim-accepted input
     produces a cluster of visible side-effects (in0 pulse, readGate
     output, i1 ack, inhibit pulses, …). Cadence captures whole
     clusters and replays them visibly as a unit. Approaches the
     (b) architecture from the prior in-session discussion (sim
     headless, cadence drives visible replay). Significant refactor.

  User has not picked yet. Recommendation when picking: read the
  in-session reasoning trail above the timing fix in the chat
  history (or re-derive from this handoff + the timeline-log
  diagnosis). The C10 latch we just landed is one component of (B);
  it's not wasted work.

Cadence layer guidance for next inhabitant:
  - Module shape established by `in0ReadGateAck.ts`: module-scope
    `Map`-keyed registry + `awaiting` latch state. `resetCadence()`
    on lifecycle boundaries (load, replay-restart, at-rest play).
    Cycle-restart deliberately does NOT reset (visual pacing persists
    across sim restarts).
  - `signalPulseComplete(edgeId, fromNodeId)` is the single renderer
    hook. Both legs of every registered latch dispatch through it.
  - Adding a new cadence rule = add an entry to `spec.cadenceAcks`.
    No code change required for a same-shape rule (Input feeding any
    gate, gate emitting one output). Different rule shapes (e.g.
    multi-input gates, multi-output gates) would need extending the
    latch model.

Substrate working mode (carried forward, still active):
  The user articulated, at length, why this work is substrate-shaped
  (topology-as-logic, multi-scale timing, discrete causal sims) and
  why the AI-shaped niche menus produce flat application-layer
  framings that miss the substrate. The implication for collaboration:
    - **Don't propose niche bundles.** User-named frames stand alone.
    - **Don't offer "next options" menus proactively.** Wait for the
      user to name the next frame.
    - **Use Claude Code as a fabricator, not a co-designer.** The
      formalizing belongs to the user; the TS scaffolding belongs
      to the fabricator.
    - **Frame-shaped requests will keep arriving.** Don't try to
      reduce them to existing niches — they're substrate-driven and
      will not fit.

Lessons from this session worth carrying:
  - **Smallest-change-each-turn was wrong here.** I chased symptoms
    (per-emitter speed → renderer-side trigger → notice effect was
    sim-side → decouple) instead of naming the architectural fork
    (sim throttle / sim-once-replay / sim-and-visual-decoupled) at
    the start. When the user said "I'm threading niches together,"
    that was the cue I missed. Future turns: when stuck in symptom
    chasing, surface the fork explicitly.
  - **Visual pacing requires visual signals.** sim notify ≠ visible
    "begins emitting" because notify fires at sim-tick rate
    (~400ms) and visible traversal takes ~5s. The renderer-side
    PulseInstance mount/unmount is the only honest visual signal.
  - **The "decouple" instinct from the user was right** but only
    halfway implemented in this branch. Full decouple (option B
    above) is the architectural endpoint.

Contract registry status (docs/planning/visual-editor/contracts.md):
  C6 ✅ pulse-lifetime-view-agnostic.
  C7 ✅ renderer-or-timer race for pulse completion.
  C8 ✅ visual concurrency cap doesn't desynchronise lifecycle ledger.
  C9 ✅ uniform pulse speed across emitter types.
  C10 ✅ spec-derived cadence back-pressure (new).

Probe instrumentation (carried forward, still active):
  - `.probe/stuck-pulse-last.json` — at first stuck-anim moment.
  - `.probe/stuck-pulse-last-followup.json` — 1.5s later.
  - `.probe/stuck-pulse-last-third.json` — 30s later.
  - `RunnerProbe` toolbar latches `⚠ stuck-anim` / `⚠ stuck-pending`
    once tripped, with full pulse table in tooltip; auto-copies to
    clipboard; mirrored on `window.__pulseLeakDump`.
  - `window.__resetPulseLeak()` in console re-arms the one-shot.
  - `.probe/timeline-last.json` is invaluable for diagnosing per-edge
    emit/anim-start/anim-end sequences with values. Used heavily this
    session — recommend continuing for cadence work.

Open branches:
  - `task/in0-readgate-emission-ack` — current, several commits ahead
    of main, pushed. **Do not merge** until the label-value issue is
    resolved (option A or B above) and the user signs off.

Branch hygiene: no merge to main without explicit sign-off. Delete merged branches without re-asking. Force-push needs sign-off.
Cwd for tsc/tests/check:loc/build: tools/topology-vscode/ (Bash resets cwd — chain cd or use absolute paths).
Stop hook active: scripts/stop-checks.sh runs go build / tsc / check:loc / npm run build on relevant changes and blocks stop on failure.
If user surfaces unrelated friction, log to docs/planning/visual-editor/session-log.md and open a fresh task/<short-kebab>.

ALWAYS — at end of session, overwrite docs/planning/visual-editor/handoff.md with a freshly-rendered prompt tailored to the state you're leaving the branch in, and commit it on the task branch. Do not rely on chat history; the next AI may be a fresh model with no transcript. The rendered handoff must itself contain this same ALWAYS clause so the loop is self-perpetuating across sessions. Use docs/planning/visual-editor/continuation-prompt-template.md as the structural source of truth; update the template when an invariant changes.
