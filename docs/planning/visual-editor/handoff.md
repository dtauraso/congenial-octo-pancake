# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

---

Continuing on wirefold, branch `main`. No active task branch.
Working tree clean except for the long-standing `topology.view.json`
modification carried across branches.

State at handoff:
  `task/distance-aware-pulse-duration` merged to main and the local
  + remote branches deleted. Three things landed:

  1. **Distance-aware pulse timer.** The simulator-side pulse timer
     was a fixed per-emitter `durationMs` that ignored edge length,
     so dragging a node mid-pulse desynchronized the timer from the
     visible traversal. Replaced with `durationForLength(rule, lengthPx)
     = clamp(length / globalSpeed, minMs, maxMs)`. PulseInstance
     calls `extendPulse(pulseId, remainingMs)` once it measures the
     real arc, and again on every geom/speed re-run, so node drag
     keeps the timer matched to visible motion. Folded/headless
     edges keep an initial reference-length timer (no visual to
     diverge from).

  2. **Single global pulse speed.** Per-emitter `speedPxPerMs` made
     ChainInhibitor pulses crawl while ReadGate pulses zipped on the
     same canvas. Rules now carry only `{ minMs, maxMs, completion,
     maxConcurrentPerEdge }`; speed is one global (`pulseSpeedPxPerMs
     = 0.08 px/ms at REF_TICK_MS = 400`). Contract C9 (test/contracts/
     pulse-uniform-speed.test.ts) locks in: every registered rule
     produces the same `effectiveSpeedPxPerMs` and `durationForLength`,
     and rule shape has no `speedPxPerMs` field.

  3. **Stop-hook auto-rebuilds.** The Stop hook (`scripts/stop-checks.sh`)
     now runs `npm run build` whenever TS/TSX changed, so Cmd-R in
     the host picks up the latest webview bundle without a manual
     `npm run build`. Eliminates the "I reloaded but nothing changed"
     surprise.

  Note: chord-pacing was tried (commit 44e04f5) and reverted (commit
  b1e948a). Lesson logged for next time: arc-pacing keeps the dot at
  uniform px/ms along its own trajectory; chord-pacing makes
  equal-endpoint edges finish at the same time but inflates path-rate
  on curvy edges, which reads as "inconsistent speed". User feedback
  confirmed visually-uniform = arc-paced. Don't re-attempt chord
  pacing unless the requirement explicitly changes.

  Tests: 218/218 pass; tsc clean; check:loc clean; build clean.
  Origin/main in sync.

Contract registry status (docs/planning/visual-editor/contracts.md):
  C6 ✅ pulse-lifetime-view-agnostic.
  C7 ✅ renderer-or-timer race for pulse completion.
  C8 ✅ visual concurrency cap doesn't desynchronise lifecycle ledger.
  C9 ✅ uniform pulse speed across emitter types (new).

**The dormant "tune NODE_ANIMATION_RULES per-type" item from the prior
handoff is now retired.** Distance-aware timing made per-type duration
unnecessary; per-type speed proved actively harmful (reverted). The
table now exists only for clamps/completion/cap.

Probe instrumentation (carried forward, still active):
  - `.probe/stuck-pulse-last.json` — at first stuck-anim moment.
  - `.probe/stuck-pulse-last-followup.json` — 1.5s later.
  - `.probe/stuck-pulse-last-third.json` — 30s later.
  - `RunnerProbe` toolbar latches `⚠ stuck-anim` / `⚠ stuck-pending`
    once tripped, with full pulse table in tooltip; auto-copies to
    clipboard; mirrored on `window.__pulseLeakDump`.
  - `window.__resetPulseLeak()` in console re-arms the one-shot.

Open branches:
  - none (on main, idle).

Next options (dormant, not started — pick by friction, not order):
  1. **visualize-gate-buffer-state.** Surface ReadGate / SyncGate
     internal latch state in the editor so backpressure stalls are
     diagnosable without console probes. Friction signal: any time a
     stuck-pulse session ends with "the gate was waiting for X."
  2. **backpressure-slack-envelope.** Define a per-edge slack budget
     (max in-flight pulses across the latch chain) and assert it in a
     contract test. Today the cap is `maxConcurrentPerEdge=1` per
     rule but the chain-wide envelope is implicit. Friction signal:
     pulse-leak debugging that hinges on counting in-flight pulses.
  3. **stepping-semantics-doc.** Write up the step / play / pause /
     scrub semantics in one place; current knowledge is scattered
     across runner.ts, playback.ts, and chat history. Friction
     signal: any future debug that requires re-deriving "what does
     simTime do during pause."
  4. **NODE_ANIMATION_RULES cleanup.** Now that all rules are
     identical (just defaults), the registry is mostly noise. Could
     collapse to `DEFAULT_RULE` + a small per-type overrides map.
     Pure code-tidy; only do it if a related task already touches
     this file.

Branch hygiene: no merge to main without explicit sign-off. Delete merged branches without re-asking. Force-push needs sign-off.
Cwd for tsc/tests/check:loc/build: tools/topology-vscode/ (Bash resets cwd — chain cd or use absolute paths).
Stop hook active: scripts/stop-checks.sh runs go build / tsc / check:loc / npm run build on relevant changes and blocks stop on failure.
If user surfaces unrelated friction, log to docs/planning/visual-editor/session-log.md and open a fresh task/<short-kebab>.

ALWAYS — at end of session, overwrite docs/planning/visual-editor/handoff.md with a freshly-rendered prompt tailored to the state you're leaving the branch in, and commit it on the task branch. Do not rely on chat history; the next AI may be a fresh model with no transcript. The rendered handoff must itself contain this same ALWAYS clause so the loop is self-perpetuating across sessions. Use docs/planning/visual-editor/continuation-prompt-template.md as the structural source of truth; update the template when an invariant changes.
