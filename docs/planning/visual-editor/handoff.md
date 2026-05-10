# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — **start here**
     for the next commit. Spec has been re-framed: wire-as-entity,
     not inbox-deferral. Read carefully — this reverses the prior
     cheap-fix framing.
  2. [handoff-step1-notes.md](handoff-step1-notes.md) — what was
     built on the rebuild branch (decision audit, coupling hacks
     gated to step 1, automated logging, e2e).
  3. [handoff-gate-a.md](handoff-gate-a.md) — earlier merge to main
     (Gate A).
  4. [handoff-rebuild-plan.md](handoff-rebuild-plan.md) — port plan,
     contracts R1–R5, auto-retire signal.
  5. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-09, thirty-sixth session):
  Active branch: `task/node-ticks`. Commit `f4c8d01` + this
  session's guardrail commit. No code refactor yet; this session
  added drift guardrails after the AI repeatedly imported timing
  vocabulary into the substrate model despite explicit corrections.

  **Key shift this session:** David refined the model further and
  named the AI's drift pattern. Substrate is event-ordering only —
  no durations, no schedules, no wall-clock anywhere. Substrate
  halts/resumes pulses; renderer owns motion and never signals back.
  Tick = ordinal count, not a slice of time. Tick close is observed
  (wires return to `empty`), not scheduled.

  **Guardrails added (this session's commit):**
  - [MODEL.md](../../../MODEL.md) at repo root: substrate model in
    David's words + banned-vocabulary list.
  - [tools/topology-vscode/scripts/check-substrate-vocab.mjs](../../../tools/topology-vscode/scripts/check-substrate-vocab.mjs):
    greps substrate/ for drift words. 10 baseline hits in legacy
    files; refactor retires them.
  - CLAUDE.md top-of-file pointer + rule: "no multi-step plans with
    options for substrate/wire work; state next single step and
    wait."

  Memory entries:
  `feedback_derive_model_from_visual_spec.md` (cheap-fix detector,
  prior session). A vocabulary-drift sibling is a candidate add-on
  but not yet written.

  Pre-existing red tests, still red, still not blocking:
  `shape-d-cycle.test.ts` (ackEdge race), `handle-load-repro.test.ts`.

  Carried context: Shape D self-pumps via `fb56c30`'s i1 fan-out +
  one-shot `seedLoop` + per-round `setTimeout(0)`. Manual-ack:
  [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md).

  Working tree: `topology.json` (`"runtime": "ticked"` flag for
  verification) and `topology.view.json` (camera drift) — editor
  state, intentionally not committed. Reference branches retained:
  `task/runtime-substrate-rebuild`, `task/wires`,
  `task/node-visuals-strip`. Do not delete.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher
fired` to Output → Log (Extension Host).

## Next move

**Read [MODEL.md](../../../MODEL.md) first.** Then see
[handoff-next-task.md](handoff-next-task.md) for the refined wire
model. Open refinements before code: legacy non-ticked path
disposition, halt/resume location (substrate flag vs wire flag),
multi-send-per-round policy.

Smallest honest first step: a red contract test pinning wire state
`empty | carrying(v)`, geometry-independence, and zero timing
vocabulary in substrate (lint-style assertion). No code refactor
until David signs off on the step sequence.

Dormant options (do not pursue ahead of wire-as-entity):
  - Triage pre-existing red tests.
  - Shape D port under manual-ack.
  - Uniform-node, timeout-removal.

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
