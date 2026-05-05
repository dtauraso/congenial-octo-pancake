# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

---

Continuing on wirefold, branch task/dom-substrate-happy-dom.

State at handoff:
  Local + origin/task/dom-substrate-happy-dom in sync at {{short-sha after this commit}}.
  npm test → 199/199 pass (59 files, contracts/ at 21/21).
  npm run check:loc → not re-run this turn.
  Working tree: topology.view.json modified (pre-existing, not from this turn).

Per-branch decision summary: this branch stood up the DOM substrate
(happy-dom + @testing-library/react), then used it to close the last
two pending integration contracts (C1 Tier-2, C4 Tier-3). All five
rows in the registry are now ✅.

Contract registry status (docs/planning/visual-editor/contracts.md):
  C1 ✅ ready-once + ready-once-hook (Tier 1+2)
  C2 ✅ spec-data-roundtrip
  C3 ✅ view-load-setviewport
  C4 ✅ pulse-bridge-balance (Tier 3, happy-dom + <PulseInstance>)
  C5 ✅ stuck-pending-precondition

Open branches (pushed, unmerged):
  task/dom-substrate-happy-dom — DOM substrate + C1 Tier-2 + C2 row + C4 Tier-3 + handoff-in-repo refactor. Ready to merge with sign-off.

Next options (each justified against "what did the rest of the world converge on"):
1. Merge task/dom-substrate-happy-dom to main — needs sign-off. All five contracts ✅, full suite green. Clean shippable state.
2. Drive the editor and log fresh friction to session-log.md (post-v0 default mode — no contract debt to chase).
3. Open one of the dormant recommended branches (visualize-gate-buffer-state, backpressure-slack-envelope, stepping-semantics-doc).
4. Pre-merge polish: run npm run check:loc and address any offenders before the merge ask.

Branch hygiene: no merge to main without explicit sign-off. Delete merged branches without re-asking. Force-push needs sign-off.
Cwd for tsc/tests/check:loc/build: tools/topology-vscode/ (Bash resets cwd — chain cd or use absolute paths).
If user surfaces unrelated friction, log to docs/planning/visual-editor/session-log.md and open a fresh task/<short-kebab>.

ALWAYS — at end of session, overwrite docs/planning/visual-editor/handoff.md with a freshly-rendered prompt tailored to the state you're leaving the branch in, and commit it on the task branch. Do not rely on chat history; the next AI may be a fresh model with no transcript. The rendered handoff must itself contain this same ALWAYS clause so the loop is self-perpetuating across sessions. Use docs/planning/visual-editor/continuation-prompt-template.md as the structural source of truth; update the template when an invariant changes.
