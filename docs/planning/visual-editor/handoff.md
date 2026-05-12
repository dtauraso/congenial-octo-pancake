# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — open task:
     review the substrate model pivot draft and decide the three
     open questions before any code touches the substrate.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — substrate model background (forever-loops). Realized by the
     React-component substrate currently on `main`, which the
     pivot draft proposes to revise.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-11, end of session):

  **Active branch:** `task/substrate-slot-in-node` (commit
  `cc9ee2f`). Pure additive: drafts a substrate model pivot in
  [MODEL-revised-draft.md](../../../MODEL-revised-draft.md) and
  seven illustrative SVGs in
  [diagrams/model-revised-draft/](../../../diagrams/model-revised-draft/).
  No code changes. [MODEL.md](../../../MODEL.md) is still
  authoritative.

  **What the draft proposes:** split today's fused `<Wire>` object.
  Wire becomes transient (`empty → in-flight(v) → empty`); the
  parked slot moves to the destination node
  (`empty → filled(v) → consumed`); source nodes observe
  `dest.slotPhase(slotId)` directly instead of through wire phase.
  Motivation: the current parked-on-wire model conflates substrate
  phase, RAF animation, and React mount lifecycle in one
  component, making any cross-cutting change (deletion mid-flight,
  rewiring, multi-input firing rules like ReadGate) fragile.

  **Why it surfaced:** the user was working through what ReadGate
  needs to do (consume N input slots, emit a pulse) and the
  conversation derived that the slot-in-wire model couldn't
  cleanly express multi-input firing rules without nodes naming
  each other or duplicating state. Caught before any code was
  written.

  **Three open questions in the draft** (each has Option A/B with
  pros/cons and a tentative lean):
  - Q1: tick driver shape — central walker (lean A) vs.
    self-scheduling nodes.
  - Q2: slot subscription — per-slot listeners vs. one node-level
    revision counter (lean B).
  - Q3: visual depiction of slots — on the node (lean A) vs. at
    the wire's end (current).

  **Memories that the draft will invalidate if promoted:**
  - `project_ack_is_wire_state` — under the revised model the wire
    has no ack.
  - The latch + AND-gate backpressure pattern as described in
    CLAUDE.md needs revisiting.

  **Gates:** all seven SVGs pass `xmllint --noout`. No code, so
  no build/tsc/vitest run. LOC ✓.

## Dev-loop

Read [MODEL-revised-draft.md](../../../MODEL-revised-draft.md) and
the diagrams in a tab. Decide on Q1/Q2/Q3, refine the draft if
needed. When ready, promote draft → MODEL.md, retire memories,
update CLAUDE.md, then start on code.

## Next move

See [handoff-next-task.md](handoff-next-task.md). The next concrete
step is David's review of the draft, not code.

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
