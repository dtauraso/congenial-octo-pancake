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
  Tests 232/232 (227 prior + 5 new readiness tests), tsc/check:loc/
  build all clean. Branch is several commits ahead of main; pushed.
  **NOT yet ready to merge** — chunks 1+2 of the node-owned-state
  plan landed; chunks 3–7 still open. Visually verify in0 emits
  `[0, 1, 0]` paced by cadence before any further chunks.

What landed this session:

  1. **Chunk 1 — Generic readiness seam.** New
     [src/sim/readiness.ts](../../tools/topology-vscode/src/sim/readiness.ts)
     — node-agnostic predicate registry (`register`, `unregister`,
     `ready` default-true, `clear`). Knows nothing about Inputs or
     cadence; pure predicate-by-id table. 22 LOC. Pinned by
     [test/sim/readiness.test.ts](../../tools/topology-vscode/test/sim/readiness.test.ts)
     (5 tests).

  2. **Chunk 2 — Input becomes the first node-owned class.** New
     [src/sim/input.ts](../../tools/topology-vscode/src/sim/input.ts)
     owns seed-cursor advancement via `drainReadySeeds(world, idx)`,
     which consults `ready(seed.nodeId)` and re-queues stalled seeds
     in original order.
     [step.ts](../../tools/topology-vscode/src/sim/simulator/step.ts)
     no longer mutates `pendingSeeds` directly — it calls
     `drainReadySeeds`.
     [in0ReadGateAck.ts](../../tools/topology-vscode/src/cadence/in0ReadGateAck.ts)
     `buildRegistry` now registers `() => mayEmit(srcId)` against
     the readiness seam for each cadenced source (and unregisters
     prior ids on rebuild).
     **Tight-loop guard** in `runUntil`: bail when
     `wasQuiescent && pendingSeeds.length > 0` — every due source
     held by its predicate. Renderer's pulse-complete signal will
     unstall it on the next anim-end.

  3. **Stuck-pending false-positive fix.** Cadenced-source backpressure
     looks like "queue empty + pendingSeeds non-empty" to the runner
     probe — but it's expected, not stuck. Both [playback.ts](../../tools/topology-vscode/src/sim/runner/playback.ts)
     and [probe.ts](../../tools/topology-vscode/src/sim/runner/probe.ts)
     now check `pendingSeeds.every(s => !ready(s.nodeId))` before
     reporting stuck-pending; that case returns `ok` instead. C5
     invariant unchanged (`logStuckPendingOnce` still only fires when
     `hasPendingWork` is true; we just narrowed the precondition to
     exclude legitimate predicate-held cases).

What did NOT land yet (chunks 3–7 of the plan):

  - **Chunk 3 — Remove redundant emit.ts suppression.** The wire-
    level filter in emit.ts is now dead code (sources never produce
    a notify the wire would need to drop, because seeds stall at
    the source). Collapse to unconditional dispatch + `markEmitted`
    when cadenced. Visually verify in0 shows `0, 1, 0` paced by
    cadence after chunk 3.
  - **Chunk 4 — Play/pause as the invariant's acceptance test.**
    Audit pause path: confirm pause does NOT call `resetCadence`,
    does NOT drain held cursors, does NOT touch the registry. Add
    a test: pause mid-cadence-cycle on seed `[0,1,0]`, resume,
    assert next emitted value is the held one (not a re-seed).
  - **Chunk 5 — Extend C10 for ordering + pause survival.** In
    [cadence-back-pressure.test.ts](../../tools/topology-vscode/test/contracts/cadence-back-pressure.test.ts):
    seed `[0,1,0]`, three full cadence cycles → FireRecords carry
    `[0,1,0]` in order; between completions step() produces zero
    new Input FireRecords; pause-resume preserves held value. Note:
    that file is already 216 LOC — chunk 5 should split rather than
    grow it.
  - **Chunk 6 — Inventory of remaining invariant violations.** Grep
    for code outside a node-class's module that mutates that
    class's state — latches, partition cursors, cascade counters,
    free functions in step.ts/emit.ts pushing into per-node arrays.
    Output: a list, ranked by friction (which violation actually
    causes a current bug). Don't convert any in this chunk; user
    picks the next, on its own branch.
  - **Chunk 7 — Handoff refresh.** Rewrite this file: invariant
    stated, seam in place, Input converted, play/pause invariant
    validated, C10 extended, inventory delivered. Branch ready to
    merge pending sign-off.

Plan reference: [docs/planning/decentralized-backpressure-plan.md](../decentralized-backpressure-plan.md)
  Single architectural commitment: **a node's state is advanced
  only by the node itself, in response to a local predicate it
  owns.** Back-pressure, play/pause-survives-state, and "no global
  scheduler" all fall out as consequences.

Open questions still on the plan:
  1. Tight-loop guard chosen: `wasQuiescent && pendingSeeds.length > 0`
     in runUntil. Working in tests; revisit if a non-cadence stall
     case shows up.
  2. **Existing pause/resume side-effects** — audit before chunk 4.
  3. **Predicate scope** — per-node sufficient today.
  4. **Read-only renderer access** — flag any mutating-while-reading
     paths into chunk 6's inventory.

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
  - Cadenced sources now register `() => mayEmit(srcId)` against
    the readiness seam in `buildRegistry`; the seam is the single
    contact between cadence and the sim's seed-drain.

Substrate working mode (carried forward, REINFORCED this session):
  The user articulated, at length, why this work is substrate-shaped
  (topology-as-logic, multi-scale timing, discrete causal sims) and
  why AI-shaped niche menus produce flat application-layer framings
  that miss the substrate. Lessons reinforced:
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
  See also `memory/feedback_substrate_vs_coordinator_bias.md`.

Lessons from this session worth carrying:
  - **Per-edit chunk gating works well.** User asked for "plan first
    then sign off, one at a time." Chunks 1 and 2 landed cleanly
    under that discipline. Continue.
  - **Surface side-effects in real-world UI use.** The stuck-pending
    false positive only showed up when the user reloaded the editor
    and saw `⚠ stuck-pending: 1`. Tests didn't catch it because no
    test exercises the runner-probe surface. Worth a chunk-6 entry.

Contract registry status (docs/planning/visual-editor/contracts.md):
  C6 ✅ pulse-lifetime-view-agnostic.
  C7 ✅ renderer-or-timer race for pulse completion.
  C8 ✅ visual concurrency cap doesn't desynchronise lifecycle ledger.
  C9 ✅ uniform pulse speed across emitter types.
  C10 ✅ spec-derived cadence back-pressure (will be extended in
      chunk 5: ordering + pause survival).

Probe instrumentation (carried forward, still active):
  - `.probe/stuck-pulse-last.json` / `-followup.json` / `-third.json`.
  - `RunnerProbe` toolbar latches `⚠ stuck-anim` / `⚠ stuck-pending`.
    The latter now correctly excludes predicate-held cases.
  - `window.__resetPulseLeak()` re-arms the one-shot.
  - `.probe/timeline-last.json` invaluable for diagnosing per-edge
    emit/anim-start/anim-end sequences with values.

Open branches:
  - `task/in0-readgate-emission-ack` — current, pushed. **Do not
    merge** until chunks 3–7 land and user signs off.

Branch hygiene: no merge to main without explicit sign-off. Delete merged branches without re-asking. Force-push needs sign-off.
Cwd for tsc/tests/check:loc/build: tools/topology-vscode/ (Bash resets cwd — chain cd or use absolute paths).
Stop hook active: scripts/stop-checks.sh runs go build / tsc / check:loc / npm run build on relevant changes and blocks stop on failure.
If user surfaces unrelated friction, log to docs/planning/visual-editor/session-log.md and open a fresh task/<short-kebab>.

ALWAYS — at end of session, overwrite docs/planning/visual-editor/handoff.md with a freshly-rendered prompt tailored to the state you're leaving the branch in, and commit it on the task branch. Do not rely on chat history; the next AI may be a fresh model with no transcript. The rendered handoff must itself contain this same ALWAYS clause so the loop is self-perpetuating across sessions. Use docs/planning/visual-editor/continuation-prompt-template.md as the structural source of truth; update the template when an invariant changes.
