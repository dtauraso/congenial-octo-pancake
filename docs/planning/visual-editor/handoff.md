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

State at handoff (2026-05-09, twenty-seventh session):
  Active branch: `task/node-ticks`. User observed that `in0→readGate`
  was pulsing constantly with no backpressure. Diagnosed as
  pair-substrate's intentional reliance on visual-layer
  arc-completion auto-ack to fire `wForward.onAck` → release next
  permit. Fix: `setupInputReadGatePair` now declares
  `manualAckEdges: [{ id: edge.id, label: "in0→readGate" }]`, so
  the visual layer no longer auto-acks on arc completion; the
  user's "⏏ in0→readGate" button is the only ack source. Slot fills
  on first pulse, stays full until clicked, click → permit → next
  pulse. Visual cadence still not user-verified this session.

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

**Verify slot/button backpressure in the editor.** See
[handoff-next-task.md](handoff-next-task.md) for the full procedure.

  1. `cd tools/topology-vscode && npm run build`, F5 / Run Extension.
     Open the Shape A spec at repo root.
  2. Expected: one pulse on `in0→rg` lands and stays. The
     "⏏ in0→readGate" button becomes enabled.
  3. Click → exactly one new pulse. Repeat. No clicks → no pulses.
  4. If pulses stack without clicks, the visual layer is ignoring
     `_manualAckSet`. If clicks don't produce a pulse, the
     `wForward.onAck` → `wPermit.send` → in0 chain in
     `runtime-wires-pair.ts` is broken.

Shape D port and uniform-node work remain on hold until the manual
ack model is user-verified.

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
