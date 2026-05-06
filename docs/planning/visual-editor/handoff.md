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
  `task/animation-rules-tuning` merged to main (commit 6bdff59) and
  the local + remote branches deleted. Two fixes are live:

  1. **Bike-brakes pause.** Pulse completion timers used wall-clock
     `setTimeout(durationMs)`, which kept counting during pause and
     silently completed pulses while frozen mid-arc. Added
     `pauseAllPulseTimers` / `resumeAllPulseTimers` in
     [pulse-completion.ts](../../tools/topology-vscode/src/sim/runner/pulse-completion.ts);
     on pause we clear each armed timer and stash the remainder, on
     resume we re-arm with the saved value. Wired into
     [playback.ts](../../tools/topology-vscode/src/sim/runner/playback.ts)
     `pause()` / `play()`. Sim time and rAF were already paused; this
     closes the third clock.

  2. **View-load position rebuild.** The "load" message wins the race
     against the async sidecar read, so `specToFlow` runs with an
     empty `viewerState` and every node falls back to its default
     position. The "view-load" handler used to only rebuild RF nodes
     when `folds.length > 0`, so reloading any topology with no folds
     left every node stacked at the origin. Fix in
     [_handle-view-load.ts](../../tools/topology-vscode/src/webview/rf/app/_handle-view-load.ts):
     drop the folds guard; always rebuild once the spec is present.

  User signed off live ("things look good").

  Origin/main is in sync. 214/214 tests pass; tsc clean; check:loc
  clean.

**Reframing of the original task:** the dormant "tune
NODE_ANIMATION_RULES per-type" item was set up when the renderer was
SVG with fixed node positions. With draggable RF nodes, edge length
varies, so per-type fixed `durationMs` values can't track actual
edge traversal time — short edges look slow, long edges look stacked.
Tuning the per-type table is patching the wrong axis.

**Next task — open question, not yet started.** Two options on the
table for the running-mode mismatch (pause-freeze covers inspection):

  1. **Distance-aware duration.** Per-pulse `durationMs` = edge length
     (px) × per-type speed (px/ms), with min/max clamps. Per-type
     rule becomes "speed + clamp" instead of fixed duration. Keeps
     ChainInhibitor-dwells / ReadGate-snaps semantic intent but
     adapts to layout.
  2. **Renderer-driven completion only, drop the timer.** Let visual
     finish whenever the path animation ends. Requires re-checking
     contracts C6/C7/C8; the timer is the fallback for stuck pulses,
     so removing it isn't free.

  Recommend (1). Decide before opening a branch.

Probe instrumentation (carried forward, still active on main):
  - `.probe/stuck-pulse-last.json` — at first stuck-anim moment.
  - `.probe/stuck-pulse-last-followup.json` — 1.5s later.
  - `.probe/stuck-pulse-last-third.json` — 30s later.
  - `RunnerProbe` toolbar latches `⚠ stuck-anim` / `⚠ stuck-pending`
    once tripped, with full pulse table in tooltip; auto-copies to
    clipboard; mirrored on `window.__pulseLeakDump`.
  - `window.__resetPulseLeak()` in console re-arms the one-shot.

Open branches:
  - none (on main, idle)

Other recommended branches (dormant, not started):
  - distance-aware-pulse-duration (the reframed successor to
    animation-rules-tuning; see above)
  - visualize-gate-buffer-state
  - backpressure-slack-envelope
  - stepping-semantics-doc

Branch hygiene: no merge to main without explicit sign-off. Delete merged branches without re-asking. Force-push needs sign-off.
Cwd for tsc/tests/check:loc/build: tools/topology-vscode/ (Bash resets cwd — chain cd or use absolute paths).
Stop hook now active: scripts/stop-checks.sh runs go build / tsc / check:loc on relevant changes and blocks stop on failure.
If user surfaces unrelated friction, log to docs/planning/visual-editor/session-log.md and open a fresh task/<short-kebab>.

ALWAYS — at end of session, overwrite docs/planning/visual-editor/handoff.md with a freshly-rendered prompt tailored to the state you're leaving the branch in, and commit it on the task branch. Do not rely on chat history; the next AI may be a fresh model with no transcript. The rendered handoff must itself contain this same ALWAYS clause so the loop is self-perpetuating across sessions. Use docs/planning/visual-editor/continuation-prompt-template.md as the structural source of truth; update the template when an invariant changes.
