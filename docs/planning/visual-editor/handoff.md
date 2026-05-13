# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — open task:
     first code touch landing slot-on-node + wire-bound-slot-id
     in the substrate. Model promotion is already done.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — forever-loop substrate background; layered with the resolved
     slot-in-node model (slots owned by nodes, wire-bound slot id,
     self-scheduling + global gate, cohort-indexed step).
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame,
     working mode, open branches, housekeeping.

---

State at handoff (2026-05-13, end of session):

  **Active branch:** `task/substrate-slot-in-node`. Promotion
  complete at commit 5f9ad30 (pushed): [MODEL.md](../../../MODEL.md)
  is now the authoritative slot-in-node model;
  `MODEL-revised-draft.md` deleted; [CLAUDE.md](../../../CLAUDE.md)
  "Latch + AND gate backpressure pattern" section replaced with the
  slot-phase backpressure description + cohort stepping pointer.
  SVG diagrams under
  [diagrams/model-revised-draft/](../../../diagrams/model-revised-draft/)
  are unchanged and remain the canonical visuals. **No substrate
  code touched yet.**

  **Memories updated.**
  - `project_ack_is_wire_state` — retired (file deleted, MEMORY.md
    index entry removed). The wire has no ack under the resolved
    model; backpressure lives in the slot's empty/filled state.
  - `feedback_clear_button_armed_only_when_loaded` — rewritten to
    slot-phase vocabulary (`armed = slotPhase === "filled"`,
    `dest.slotPhase(slotId)`); MEMORY.md index entry updated.

  **Pre-existing uncommitted diff:** `topology.view.json` carries a
  modification that pre-dated this session — not part of the
  promotion commit. Leave it alone unless a future session has a
  reason to touch it.

  **Gates:** model + docs changes only; no code, so no
  build/tsc/vitest run. LOC ✓. `check-substrate-vocab.mjs` reports
  "substrate/ directory not present; vocab check skipped."

## Dev-loop

Read [MODEL.md](../../../MODEL.md) + diagrams under
[diagrams/model-revised-draft/](../../../diagrams/model-revised-draft/).
The model is authoritative now. Start code: first touch lands the
slot-on-node + wire-bound-slot-id substrate change. Gate + cohort
registry can come in a second commit.

## Next move

See [handoff-next-task.md](handoff-next-task.md). The next concrete
step is the first code commit: slot on destination node, wire
carries `(value, bound slot id)`, arrival writes the named slot.

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to
the state you're leaving the branch in, and commit on the active
branch (main if no task is in flight). Do not rely on chat
history; the next AI may be a fresh model with no transcript. The
rendered handoff must itself contain this same ALWAYS clause so
the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
