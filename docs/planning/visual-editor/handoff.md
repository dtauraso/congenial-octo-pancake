# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

---

Continuing on wirefold, branch main (no active task branch).

State at handoff:
  Local main post-merge of task/input-node-stdout + task/run-flush-pending-edits.
  Push pending.
  npm test → 199/199 pass (59 files) — last run on run-flush-pending-edits tip pre-merge.
  npm run check:loc → clean (no source files ≥ 200 LOC).
  go build / go test ./... → clean (post InputNode print add).
  Working tree: topology.json + topology.view.json + Wiring.go modified
  (in-flight editor state from this session's dogfooding, pre-existing).

Per-session decision summary:
1. task/sim-readgate-decline (merged earlier, d344f7f): in0 was firing
   on a steady tick cadence because makeJoin consumed chainIn into the
   join state immediately, freeing the inputToReadGate slot before
   readGate had actually fired. Fix: HandlerResult gains optional
   `decline?: boolean`; makeJoin gains optional `gatedPort` (readGate
   uses gatedPort: "chainIn"); step.ts re-queues declined events at
   tick+1 without touching state/slot/history.
2. task/input-node-stdout: Input nodes had no fmt.Printf so an
   editor-side rename of an Input node never showed up in `go run`
   stdout. Added `fmt.Printf("%s: sent %d\n", n.Name, n.value)` in
   InputNode.Update on each successful send.
3. task/run-flush-pending-edits: editor → Go output pipeline was racy.
   (a) The Run button could fire while a contenteditable rename was
   still focused, or before the 250ms save debounce had fired —
   topology.json on disk lagged behind the editor view. Fix: RunButton
   blurs any active inline edit (commits via the existing blur
   listener), bundles the latest spec text into the run message, and
   the host applies+saves that text before topogen.write().
   (b) Post-rename, dblclicking the same node re-opened the edit field
   with the OLD name and "undid" the rename. Root cause: mutateBoth
   replaces store.spec via immer but ctx.lastSpec.current was only
   updated on load/connect/undo. inline-edit's rerenderFromSpec used
   the stale lastSpec, so RF kept OLD node ids; the displayed label
   only looked correct because the contenteditable's typed-in text
   persisted through React's no-op reconciliation. Fix:
   rerenderFromSpec now sources getSpec() from the live store and
   writes it back into lastSpec.current.

All three branches merged to main with sign-off and deleted.

Contract registry status (docs/planning/visual-editor/contracts.md):
  C1 ✅ ready-once + ready-once-hook (Tier 1+2)
  C2 ✅ spec-data-roundtrip
  C3 ✅ view-load-setviewport
  C4 ✅ pulse-bridge-balance (Tier 3, happy-dom + <PulseInstance>)
  C5 ✅ stuck-pending-precondition

Open branches (pushed, unmerged):
  (none — task/input-node-stdout + task/run-flush-pending-edits merged and deleted)

Next options (each justified against "what did the rest of the world converge on"):
1. Drive the editor and log fresh friction to docs/planning/visual-editor/session-log.md (post-v0 default — the world converged on dogfooding-driven iteration once a v0 ships).
2. Open one of the dormant recommended branches: visualize-gate-buffer-state, backpressure-slack-envelope, stepping-semantics-doc. Each needs a fresh task/<short-kebab> branch.
3. Audit pass — see docs/planning/visual-editor/audits.md for the registry of CI-backed, human-driven, and AI-driven audit kinds.

Branch hygiene: no merge to main without explicit sign-off. Delete merged branches without re-asking. Force-push needs sign-off.
Cwd for tsc/tests/check:loc/build: tools/topology-vscode/ (Bash resets cwd — chain cd or use absolute paths).
If user surfaces unrelated friction, log to docs/planning/visual-editor/session-log.md and open a fresh task/<short-kebab>.

ALWAYS — at end of session, overwrite docs/planning/visual-editor/handoff.md with a freshly-rendered prompt tailored to the state you're leaving the branch in, and commit it on the task branch. Do not rely on chat history; the next AI may be a fresh model with no transcript. The rendered handoff must itself contain this same ALWAYS clause so the loop is self-perpetuating across sessions. Use docs/planning/visual-editor/continuation-prompt-template.md as the structural source of truth; update the template when an invariant changes.
