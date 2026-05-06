# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

---

Continuing on wirefold, branch `task/fold-delete-crash` (unpushed).
Working tree clean except for the long-standing `topology.view.json`
modification carried across branches.

State at handoff:
  Friction reported: deleting a fold node in folded mode appeared to
  make almost the entire editor vanish; the only recovery was
  removing the topology-diff overlay and reloading the topology.json
  tab.

  Investigation (one-shot in-process probe wired through the existing
  `.probe/*.json` mechanism, kept the bundle out of the shipped diff)
  showed RF was producing a `select` change for the fold but never a
  `remove` change after the Backspace keypress. The keydown event
  itself reached the window with `defaultPrevented: false` and target
  = the selected fold-placeholder div. RF v11's `useKeyPress` skips
  global delete when the active element is the focused node DOM —
  exactly what happens once you click a fold-placeholder.

  Two fixes shipped in this branch:

  1. **Webview-level keydown bypass for fold delete.** A capture-phase
     handler at
     [tools/topology-vscode/src/webview/rf/app.tsx](../../tools/topology-vscode/src/webview/rf/app.tsx)
     calls `delH.onNodesDelete` directly with any selected fold nodes
     when Backspace/Delete is pressed (skipping inputs / contenteditable
     so it doesn't fight inline editors). This sidesteps the RF quirk.

  2. **Position fix in the diff-overlay path.**
     `decorateForCompare` and `decorateForOnion` were calling
     `specToFlow(visible, folds, {})` with an empty viewer-state, so
     while a diff overlay was active every member's RF position fell
     back to (0,0). The fold itself was unaffected (it uses
     `fold.position` directly), so the bug stayed hidden until a
     fold was deleted under the overlay — at which point all members
     of the deleted fold appeared at the origin, looking "vanished"
     from a panned viewport. Threaded `viewerState` through both
     decorate paths.

  Tests added:
  - [tools/topology-vscode/test/diff-decorate.test.ts](../../tools/topology-vscode/test/diff-decorate.test.ts)
    — locks down "decorateForCompare preserves member positions from
    viewer state" (no (0,0) fallback).
  - [tools/topology-vscode/test/fold.test.ts](../../tools/topology-vscode/test/fold.test.ts)
    — locks down "deleting a collapsed fold restores members and
    original edges as if the fold never existed."

  214/214 tests pass. tsc clean. check:loc clean. webview build clean.

**Live verification status:** user verified the fix works in the
editor ("working. ship it.").

**Branch is mergeable to main pending user sign-off.**

**Next session's first task:** await merge sign-off, then return to
the dormant follow-ups. Tuning `NODE_ANIMATION_RULES` per-type
remains the highest-priority dormant item — current values are
guesses against the prior 2000ms global baseline.

Probe instrumentation (carried forward, still active):
  - `.probe/stuck-pulse-last.json` — at first stuck-anim moment.
  - `.probe/stuck-pulse-last-followup.json` — 1.5s later.
  - `.probe/stuck-pulse-last-third.json` — 30s later.
  - `RunnerProbe` toolbar latches `⚠ stuck-anim` / `⚠ stuck-pending`
    once tripped, with full pulse table in tooltip; auto-copies to
    clipboard; mirrored on `window.__pulseLeakDump`.
  - `window.__resetPulseLeak()` in console re-arms the one-shot.

Open branches:
  - task/fold-delete-crash (this branch, unpushed)

Other recommended branches (dormant, not started):
  - visualize-gate-buffer-state
  - backpressure-slack-envelope
  - stepping-semantics-doc

Branch hygiene: no merge to main without explicit sign-off. Delete merged branches without re-asking. Force-push needs sign-off.
Cwd for tsc/tests/check:loc/build: tools/topology-vscode/ (Bash resets cwd — chain cd or use absolute paths).
Stop hook now active: scripts/stop-checks.sh runs go build / tsc / check:loc on relevant changes and blocks stop on failure.
If user surfaces unrelated friction, log to docs/planning/visual-editor/session-log.md and open a fresh task/<short-kebab>.

ALWAYS — at end of session, overwrite docs/planning/visual-editor/handoff.md with a freshly-rendered prompt tailored to the state you're leaving the branch in, and commit it on the task branch. Do not rely on chat history; the next AI may be a fresh model with no transcript. The rendered handoff must itself contain this same ALWAYS clause so the loop is self-perpetuating across sessions. Use docs/planning/visual-editor/continuation-prompt-template.md as the structural source of truth; update the template when an invariant changes.
