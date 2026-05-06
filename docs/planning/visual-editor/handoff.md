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
  `task/fold-delete-crash` merged to main (commit b970639) and
  the local branch deleted. Both fixes are live:
  webview-level Backspace/Delete bypass for RF v11's fold-placeholder
  keydown quirk, and viewerState threaded through `decorateForCompare`
  / `decorateForOnion` so members keep their positions under a diff
  overlay. User signed off live ("working. ship it.").

  Origin/main is in sync — nothing pending to push.

**Next task (highest-priority dormant follow-up):** tune
`NODE_ANIMATION_RULES` per-type at
[tools/topology-vscode/src/sim/runner/node-animation-rules.ts](../../tools/topology-vscode/src/sim/runner/node-animation-rules.ts).
Current values are guesses set against the old 2000ms global baseline
and have not been calibrated per node-type. Open a fresh
`task/animation-rules-tuning` (or similar) branch when starting.

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
  - visualize-gate-buffer-state
  - backpressure-slack-envelope
  - stepping-semantics-doc

Branch hygiene: no merge to main without explicit sign-off. Delete merged branches without re-asking. Force-push needs sign-off.
Cwd for tsc/tests/check:loc/build: tools/topology-vscode/ (Bash resets cwd — chain cd or use absolute paths).
Stop hook now active: scripts/stop-checks.sh runs go build / tsc / check:loc on relevant changes and blocks stop on failure.
If user surfaces unrelated friction, log to docs/planning/visual-editor/session-log.md and open a fresh task/<short-kebab>.

ALWAYS — at end of session, overwrite docs/planning/visual-editor/handoff.md with a freshly-rendered prompt tailored to the state you're leaving the branch in, and commit it on the task branch. Do not rely on chat history; the next AI may be a fresh model with no transcript. The rendered handoff must itself contain this same ALWAYS clause so the loop is self-perpetuating across sessions. Use docs/planning/visual-editor/continuation-prompt-template.md as the structural source of truth; update the template when an invariant changes.
