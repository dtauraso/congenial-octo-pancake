# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-step1-notes.md](handoff-step1-notes.md) — what was
     built on the rebuild branch (decision audit, coupling hacks
     gated to step 1, automated logging, e2e).
  2. [handoff-gate-a.md](handoff-gate-a.md) — earlier merge to main
     (Gate A).
  3. [handoff-next-task.md](handoff-next-task.md) — **start here**
     for the next commit.
  4. [handoff-rebuild-plan.md](handoff-rebuild-plan.md) — port plan,
     contracts R1–R5, auto-retire signal.
  5. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-09, eighteenth session):
  Active branch: `task/node-ticks`. Latest commit: `fb56c30`
  (option (c) — cycle drives chainIn, in0 becomes seed). Suite green
  (259/259), tsc + build clean.

  Shape D self-pumps via i1 fan-out to both `readGate.chainIn` and
  `readGate.ack`. in0 is a one-shot `seedLoop`. All four cycle edges
  are consume-on-read; the fan-out node yields `setTimeout(0)` once
  per round-trip to keep the cycle from starving macrotasks.

  Earlier-branch context: `6548f9b` (self-pumping infra: substrate
  primitive `andGateLoopWithCycleInputs`, ticks counter, StepButton
  removed). `5193bc6` closed the cycle-2 gap. `e9e3fef` fixed the
  `andGateLoop` pacing bug. `TriggerGate` plumbing is still unused
  but in tree. Conceptual frame: **concurrent clocks frozen on
  command**. Manual-ack mechanism doc:
  [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md).

  Working tree: `.claude/settings.json` and `topology.view.json` carry
  incidental drift — leave or stash. Reference branches retained:
  `task/runtime-substrate-rebuild`, `task/wires`,
  `task/node-visuals-strip`. Do not delete.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher
fired` to Output → Log (Extension Host).

## Next move

Option (c) chosen and implemented (`fb56c30`). i1 fan-out closes the
cycle by driving both `readGate.chainIn` and `readGate.ack`. in0 is a
one-shot seed. Rationale (b)-was-rejected: gating inputLoop on the
cycle would couple in0 to the cycle and destroy readGate's AND
"two independent arrivals" semantics.

New substrate primitive `andGateLoopFanOut` in
[node-loop-cycle.ts](../../../tools/topology-vscode/src/substrate/node-loop-cycle.ts)
takes (inbound, cycleMask, outbound[], reduce). It yields ONE
`setTimeout(0)` per round-trip — without that yield the fully
self-pumping cycle pumps in microtasks only and starves macrotasks
(test ticks, animation frames; OOMs in tests). The fan-out node is
the natural pacing point because it closes the cycle.

Contract test
[shape-d-cycle.test.ts](../../../tools/topology-vscode/test/contracts/shape-d-cycle.test.ts)
relaxed: no external autoAcks (loops self-ack), depth==0 at quiescence
is no longer reachable (cycle always holds an in-flight token), so we
assert `depth ≤ 1` and `|arrives - acks| ≤ 1` plus ≥3 round-trips.
Diagnosis history in
[handoff-cycle2-diagnosis.md](handoff-cycle2-diagnosis.md).

Other open paths
([handoff-next-task.md](handoff-next-task.md)) — Shape C contract
test, deleting unused `TriggerGate`, running editor to confirm visual
layer behaves with the fan-out — remain available. Before touching
the manual-ack code, read
[../../manual-ack-mechanism.md](../../manual-ack-mechanism.md).

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
