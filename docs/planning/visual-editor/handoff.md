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

State at handoff (2026-05-09, twenty-fourth session):
  Active branch: `task/node-ticks`. Per-node `prevSlotEmpty` rule
  on the step-substrate Input did not change visible cadence —
  pulses still stack. Diagnosis session **reframed the problem**:
  do not patch the rule, do not patch the step substrate. Build a
  new minimal shape (in0 + readGate only, two wires, callback state
  machines, no ticks, no `await`) that exposes a real "occupied"
  phase between send and consume.

  Step substrate same-tick drain and the retired Promise/await
  substrate share one failure mode: writer and reader collapse into
  one indistinguishable instant. CLAUDE.md medium-vs-substance rule
  names this. Plan in
  [handoff-next-task.md](handoff-next-task.md). No code yet — next
  session implements `setupInputReadGatePair` in a new
  `substrate/runtime-wires-pair.ts`.

  Carried context: Shape D self-pumps via `fb56c30`'s i1 fan-out +
  one-shot `seedLoop` + per-round `setTimeout(0)` yield in
  `andGateLoopFanOut`. Conceptual frame: **concurrent clocks frozen
  on command**. Manual-ack doc:
  [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md).

  Working tree: `.claude/settings.json`, `topology.view.json`, and
  pre-existing edits to `runtime-wires-shapes.ts` +
  `test/contracts/runtime-wires-manual-ack.test.ts` carry incidental
  drift — leave or stash. Reference branches retained:
  `task/runtime-substrate-rebuild`, `task/wires`,
  `task/node-visuals-strip`. Do not delete.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher
fired` to Output → Log (Extension Host).

## Next move

**Build the in0+readGate pair shape.** See
[handoff-next-task.md](handoff-next-task.md) for the full plan.
Summary:

  - Two wires: `wForward: in0→readGate` (cap 0, animated) and
    `wPermit: readGate→in0` (cap 1, "go" token).
  - Node loops are callback state machines on `onArrive`/`onAck`/
    `onValueChange`. **No `await` in node bodies, no ticks, no
    driver.** The pulse traversing the arc on screen is the only
    timer; `usePulseLanesWire` already calls `ackWire(wForward)` on
    arrival, which triggers readGate to send the next permit.
  - New `substrate/runtime-wires-pair.ts` + new match case so this
    topology routes here, not through `step/`. Step substrate stays
    in tree as reference.

Diagnostic value: if pulses space cleanly under the pair shape, the
step substrate's tick/drain ordering was the cause. If they still
stack, bug is in
[_use-pulse-lanes-wire.ts](../../../tools/topology-vscode/src/webview/rf/AnimatedEdge/_use-pulse-lanes-wire.ts).

Shape D port and uniform-node work
([handoff-shape-d-plan.md](handoff-shape-d-plan.md),
[handoff-timeout-removal.md](handoff-timeout-removal.md),
[handoff-uniform-node-plan.md](handoff-uniform-node-plan.md))
remain on hold until the pair shape reads as discrete arcs.

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
