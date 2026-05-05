# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

---

Continuing on wirefold, branch main (no active task branch).

State at handoff:
  Local main at d344f7f (post-merge of task/sim-readgate-decline). Push pending.
  npm test → 199/199 pass (59 files) — last run on the task branch tip pre-merge.
  npm run check:loc → clean (no source files ≥ 200 LOC).
  Working tree: topology.view.json modified (pre-existing, still carried — not from any task work).

Per-session decision summary: user observed in0 firing on a steady
tick cadence in the editor instead of waiting for the readGate→i1→ack
cycle to complete. Root cause: the sim's makeJoin always consumed
chainIn into its join state on arrival, freeing the inputToReadGate
slot before readGate had actually fired downstream — so in0's next
pendingSeed released without backpressure. Fix landed on
task/sim-readgate-decline: HandlerResult gains optional
`decline?: boolean`; makeJoin gains optional `gatedPort` (used by
readGateJoin with gatedPort: "chainIn"); step.ts re-queues a declined
event one tick later, leaving state, slot occupancy, and history
untouched so the source stays backpressured. Verified by headless
trace and by user reload of the rebuilt webview. Merged to main with
sign-off.

Contract registry status (docs/planning/visual-editor/contracts.md):
  C1 ✅ ready-once + ready-once-hook (Tier 1+2)
  C2 ✅ spec-data-roundtrip
  C3 ✅ view-load-setviewport
  C4 ✅ pulse-bridge-balance (Tier 3, happy-dom + <PulseInstance>)
  C5 ✅ stuck-pending-precondition

Open branches (pushed, unmerged):
  (none — task/sim-readgate-decline merged and deleted)

Next options (each justified against "what did the rest of the world converge on"):
1. Drive the editor and log fresh friction to docs/planning/visual-editor/session-log.md (post-v0 default — the world converged on dogfooding-driven iteration once a v0 ships).
2. Open one of the dormant recommended branches: visualize-gate-buffer-state, backpressure-slack-envelope, stepping-semantics-doc. Each needs a fresh task/<short-kebab> branch.
3. Audit pass — see docs/planning/visual-editor/audits.md for the registry of CI-backed, human-driven, and AI-driven audit kinds.

Branch hygiene: no merge to main without explicit sign-off. Delete merged branches without re-asking. Force-push needs sign-off.
Cwd for tsc/tests/check:loc/build: tools/topology-vscode/ (Bash resets cwd — chain cd or use absolute paths).
If user surfaces unrelated friction, log to docs/planning/visual-editor/session-log.md and open a fresh task/<short-kebab>.

ALWAYS — at end of session, overwrite docs/planning/visual-editor/handoff.md with a freshly-rendered prompt tailored to the state you're leaving the branch in, and commit it on the task branch. Do not rely on chat history; the next AI may be a fresh model with no transcript. The rendered handoff must itself contain this same ALWAYS clause so the loop is self-perpetuating across sessions. Use docs/planning/visual-editor/continuation-prompt-template.md as the structural source of truth; update the template when an invariant changes.
