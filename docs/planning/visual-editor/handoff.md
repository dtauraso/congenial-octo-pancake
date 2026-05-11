# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — completed task
     record for `task/remove-legacy-runtimes` (merged to main).
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — system 3 model: forever-loops, line-level pause, events.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-10, fifty-eighth session):
  **No active task branch.** `task/remove-legacy-runtimes` merged
  to main as `95904bd` and pushed. Reference branches retained.

  Branch achievement: legacy ticked/wires runtimes deleted; frame
  renderer is the only runtime. During proof-out the renderer
  adapter pause-gate bug was surfaced and fixed — substrate stays
  timing-free, adapter owns pacing AND pause-gating. Contract test
  at `tools/topology-vscode/test/contracts/run-frames-controls.test.ts`
  covers pause/step/resume semantics.

  **Gates on main:** tsc ✓, build ✓, vitest 38 files / 193 tests pass.

  **Model:** `handoff-substrate-iteration.md`. Forever-loops per
  node and per wire; backpressure coordination; line-level pause;
  ordinal-seq state-change events; renderer owns pacing. Substrate
  **timing-free** per MODEL.md.

  **Held:** halt/resume on substrate; send-on-non-empty throws;
  renderer adapter / host-shim / frame-store live outside
  `src/substrate/` for the vocab gate.

  Working tree: `topology.view.json` and `topology.json` — editor
  state and active spec. The minimal proof-out topology is
  in08 (Input) → readGate1 (ReadGate) on `chainIn`. Reference
  branches retained — do not delete.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher
fired` to Output → Log (Extension Host). When `topology.json` is
open in an editor tab, the extension reads from the buffer (not
disk) — revert the tab if you edit the file outside VS Code.

## Next move

No active task. Drive the editor; log friction in
[session-log.md](session-log.md). When friction surfaces a
concrete task, start `task/<short-kebab>` and add a
`handoff-next-task.md` for it.

Dormant: Shape D port (deleted with wires-runtime; reintroduce only
if friction surfaces). Tick-batching audit superseded.

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the active branch
(main if no task is in flight). Do not rely on chat history; the
next AI may be a fresh model with no transcript. The rendered
handoff must itself contain this same ALWAYS clause so the loop is
self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
