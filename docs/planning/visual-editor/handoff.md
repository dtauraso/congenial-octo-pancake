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
  Implemented the in0/readGate emission ack frame and laid down the
  new sim-adjacent presentation-cadence layer at
  `tools/topology-vscode/src/cadence/` as its housing. First (and
  currently only) inhabitant: `cadence/in0ReadGateAck.ts`. The user
  picked option 1 from the prior handoff (name the layer first, then
  house the ack). The chosen name is **cadence** — narrow enough to
  resist scope creep, clearly not sim state and not runtime.

  Tests 218/218, tsc/check:loc/build all clean. Go build clean.
  Branch is one commit ahead of main; not yet pushed and not merged.
  No sign-off yet on merging to main — wait for the user.

Frame as implemented — **in0/readGate emission ack:**
  - Layer: TypeScript sim-side only. Back-channel internal to the
    visualization. Not in Go, not in simulator event state, not on
    canvas.
  - Channel: `readGate → in0` ack signal.
  - Trigger: the moment ReadGate's notify("emit") fires for an
    outbound emission (the visible output pulse begins emitting).
  - Effect: the Input feeding readGate.chainIn is permitted to emit
    its next pulse. First emission is free; every subsequent
    emission gates on the ack.
  - Wiring (see commit 3240d62):
    1. `emit.ts` self-pacer block — when re-firing on a concurrent
       edge that is Input→ReadGate.chainIn, check `cadence.mayEmit`.
       If gated, park a `PendingRefire` via `cadence.recordPending`
       and return without enqueuing/notifying. If allowed, mark
       emitted and proceed as before.
    2. `emit.ts` seed-input notify block — when notifying an
       Input-source emit on an Input→ReadGate.chainIn edge, call
       `cadence.markEmitted` so the cadence starts awaiting ack.
    3. `emit.ts` ReadGate outbound emit — after the rec.emissions
       notify loop, if rec.nodeId is a ReadGate, call
       `cadence.ackFromReadGate`. The ack callback clears
       awaiting-state and replays any parked `PendingRefire`
       (markEmitted, enqueueEmission, notify).
    4. `load.ts` and `playback.ts` — `resetCadence()` is called on
       load(), reset(), replay-restart, and at-rest play().

Cadence layer guidance for next inhabitant:
  - Module shape established by `in0ReadGateAck.ts`: module-scope
    `Set`/`Map` for the back-channel state, plus a `resetCadence()`
    that the runner calls on lifecycle boundaries. Add new resets
    to load.ts/playback.ts as inhabitants arrive. If a third
    inhabitant lands, it's worth aggregating resets behind a
    `cadence/index.ts`.
  - The handoff that defined the frame called out other things that
    likely belong in this layer: per-pulse `durationForLength`
    overrides currently scattered through PulseInstance, future
    gate-buffer-state visualization signals, "show this pulse paused
    while waiting for X" indicators. None of these are claimed work
    — they're candidates if user friction surfaces them.

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

Contract registry status (docs/planning/visual-editor/contracts.md):
  C6 ✅ pulse-lifetime-view-agnostic.
  C7 ✅ renderer-or-timer race for pulse completion.
  C8 ✅ visual concurrency cap doesn't desynchronise lifecycle ledger.
  C9 ✅ uniform pulse speed across emitter types.

Probe instrumentation (carried forward, still active):
  - `.probe/stuck-pulse-last.json` — at first stuck-anim moment.
  - `.probe/stuck-pulse-last-followup.json` — 1.5s later.
  - `.probe/stuck-pulse-last-third.json` — 30s later.
  - `RunnerProbe` toolbar latches `⚠ stuck-anim` / `⚠ stuck-pending`
    once tripped, with full pulse table in tooltip; auto-copies to
    clipboard; mirrored on `window.__pulseLeakDump`.
  - `window.__resetPulseLeak()` in console re-arms the one-shot.

Open branches:
  - `task/in0-readgate-emission-ack` — current, one commit ahead of
    main, awaiting user verification + sign-off to merge.

Verification still needed before merge:
  Tests pass and the build is clean, but the *visible* effect on a
  running editor session has not been spot-checked yet. The user has
  not driven the editor since the cadence wiring landed. Recommended
  before merge: load a spec with an Input→ReadGate.chainIn edge that
  was previously classified as concurrent, play it, and confirm
  in0's re-emission visibly waits for readGate to begin emitting
  before re-firing. If the visible cadence regresses (in0 fires
  unconditionally, or stalls indefinitely), revert before merge.

The four prior dormant niche options (visualize-gate-buffer-state,
backpressure-slack-envelope, stepping-semantics-doc,
NODE_ANIMATION_RULES cleanup) **are explicitly retired as a menu**.

Branch hygiene: no merge to main without explicit sign-off. Delete merged branches without re-asking. Force-push needs sign-off.
Cwd for tsc/tests/check:loc/build: tools/topology-vscode/ (Bash resets cwd — chain cd or use absolute paths).
Stop hook active: scripts/stop-checks.sh runs go build / tsc / check:loc / npm run build on relevant changes and blocks stop on failure.
If user surfaces unrelated friction, log to docs/planning/visual-editor/session-log.md and open a fresh task/<short-kebab>.

ALWAYS — at end of session, overwrite docs/planning/visual-editor/handoff.md with a freshly-rendered prompt tailored to the state you're leaving the branch in, and commit it on the task branch. Do not rely on chat history; the next AI may be a fresh model with no transcript. The rendered handoff must itself contain this same ALWAYS clause so the loop is self-perpetuating across sessions. Use docs/planning/visual-editor/continuation-prompt-template.md as the structural source of truth; update the template when an invariant changes.
