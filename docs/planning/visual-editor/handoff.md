# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

---

Continuing on wirefold, branch `task/pulse-rules-per-node`
(unpushed). Working tree clean except for the long-standing
`topology.view.json` modification from prior branches.

State at handoff:
  Branched off `task/pulse-animation-abstraction`. The two bugs the
  C6 fix introduced (visual stacking on slow edges, frame stall
  from N concurrent PulseInstances) have a structural fix:

  **Per-emitter-node-type animation rules.** Each node type owns
  the rules for the pulses it emits — duration, completion
  semantics, visual concurrency cap. The global
  `PULSE_DEFAULT_DURATION_MS` is gone; lifecycle clock is now
  `ruleForNodeType(srcNode.type).durationMs`.

  Three new runner-side modules:
  - [src/sim/runner/node-animation-rules.ts](../../tools/topology-vscode/src/sim/runner/node-animation-rules.ts)
    — `NodeAnimationRule = { durationMs, completion, maxConcurrentPerEdge }`.
    Per-type registry with a `DEFAULT_RULE` fallback.
  - [src/sim/runner/pulse-completion.ts](../../tools/topology-vscode/src/sim/runner/pulse-completion.ts)
    — renderer-or-timer race per pulseId. `armPulse` schedules a
    timer; `signalRendererComplete(pulseId)` ends early. Whichever
    fires first wins; loser is no-op.
  - [src/sim/runner/pulse-concurrency.ts](../../tools/topology-vscode/src/sim/runner/pulse-concurrency.ts)
    — per-edge visual-slot ledger. Renderer calls
    `tryClaimVisualSlot(edgeId, cap)`; if false, skip rendering.
    Independent of `state.activeAnimationsByEdge`.

  `pulse-lifetimes.ts` now: looks up source node type from
  `state.spec`, resolves rule, calls `noteEdgePulseStarted`,
  `armPulse(pulseId, ..., () => noteEdgePulseEnded(edgeId))`. Always
  balanced — coalesced visual emits still produce balanced
  simulator-side lifecycles (contract C8).

  AnimatedEdge: claims a visual slot per emit; if denied, skips
  spawning a `<PulseInstance>`. On done, calls
  `signalRendererComplete(ev.pulseId)` + `releaseVisualSlot(id)`.
  On unmount, releases held slots so a re-mount doesn't hit the cap.

  `EmitEvent` gained a `pulseId: string` field, generated at each
  notify site via `nextPulseId()` from event-bus.

  Contracts updated:
  - **C6** (updated) — duration is now per-emitter-type, not global.
    Test split into `pulse-lifetime-view-agnostic.test.ts` (existing
    invariant) + `pulse-duration-per-node-type.test.ts` (new).
  - **C7** (new) — pulse-renderer-or-timer race. Test:
    `pulse-renderer-or-timer.test.ts`.
  - **C8** (new) — visual coalesce keeps simulator ledger balanced.
    Test: `pulse-coalesce-balanced.test.ts`.

  212/212 tests pass (204 prior + 8 new across 3 contract test
  files). tsc clean. check:loc clean (all new files ≤ 100 LOC).
  go build clean. webview build clean.

**What is NOT yet done — next session's first task:**

  **Live verification was not run.** The simulator-side ledger is
  proved correct by tests, but the original symptoms
  (stacking on `i1.out->readGate.ack`, `msSinceLastFrame: 1615ms`)
  were observed in the live editor, not in vitest. Next session
  must:

  1. Run the editor with stuck-pulse probe re-armed
     (`window.__resetPulseLeak()`).
  2. Drive the disruption flow that previously livelocked, then
     stacked.
  3. Capture three time-spaced `.probe/stuck-pulse-last*.json`
     dumps.
  4. Confirm:
     - cycle still advances (no regression of pulse-leak fix).
     - no edge has more than `rule.maxConcurrentPerEdge` simultaneous
       `<PulseInstance>` components.
     - `msSinceLastFrame` returns to ~16ms range.
  5. If stacking persists despite the visual cap, suspect: rule
     cap not being read on the AnimatedEdge subscribe path, or a
     re-mount path that doesn't run the cleanup effect. Check
     `tryClaimVisualSlot` call site at
     [src/webview/rf/AnimatedEdge.tsx:54](../../tools/topology-vscode/src/webview/rf/AnimatedEdge.tsx#L54)
     and the unmount cleanup at line ~46.

  If verification is clean, this branch is mergeable.

**Tunable rules:** initial `NODE_ANIMATION_RULES` values are a guess
calibrated against the global 2000ms baseline. After live runs, tune
per-type. ChainInhibitor at 2500ms is the longest; ReadGate /
DetectorLatch / SyncGate at 1500ms are the shortest. All cap=1.

Probe instrumentation (carried forward, still active):
  - `.probe/stuck-pulse-last.json` — at first stuck-anim moment.
  - `.probe/stuck-pulse-last-followup.json` — 1.5s later.
  - `.probe/stuck-pulse-last-third.json` — 30s later.
  - `RunnerProbe` toolbar latches `⚠ stuck-anim` / `⚠ stuck-pending`
    once tripped, with full pulse table in tooltip; auto-copies to
    clipboard; mirrored on `window.__pulseLeakDump`.
  - `window.__resetPulseLeak()` in console re-arms the one-shot.

Open branches:
  - task/pulse-rules-per-node (this branch, unpushed)
  - task/pulse-animation-abstraction (parent, 4d4ae63 — can be
    deleted once this branch lands)
  - task/pulse-leak-investigation (8a2369a — instrumentation only,
    no fix; can be deleted once this branch lands)

Other recommended branches (dormant, not started):
  - visualize-gate-buffer-state
  - backpressure-slack-envelope
  - stepping-semantics-doc

Branch hygiene: no merge to main without explicit sign-off. Delete merged branches without re-asking. Force-push needs sign-off.
Cwd for tsc/tests/check:loc/build: tools/topology-vscode/ (Bash resets cwd — chain cd or use absolute paths).
Stop hook now active: scripts/stop-checks.sh runs go build / tsc / check:loc on relevant changes and blocks stop on failure.
If user surfaces unrelated friction, log to docs/planning/visual-editor/session-log.md and open a fresh task/<short-kebab>.

ALWAYS — at end of session, overwrite docs/planning/visual-editor/handoff.md with a freshly-rendered prompt tailored to the state you're leaving the branch in, and commit it on the task branch. Do not rely on chat history; the next AI may be a fresh model with no transcript. The rendered handoff must itself contain this same ALWAYS clause so the loop is self-perpetuating across sessions. Use docs/planning/visual-editor/continuation-prompt-template.md as the structural source of truth; update the template when an invariant changes.
