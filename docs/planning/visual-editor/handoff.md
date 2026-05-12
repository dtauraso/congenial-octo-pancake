# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — open task:
     promote the resolved substrate draft to authoritative
     `MODEL.md`, retire invalidated memories, update CLAUDE.md,
     then start code.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — forever-loop substrate background; now layered with the
     slot-in-node resolution (slots owned by nodes, wire-bound
     slot id, self-scheduling + global gate, cohort-indexed step).
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame,
     working mode, open branches, housekeeping.

---

State at handoff (2026-05-12, end of session):

  **Active branch:** `task/substrate-slot-in-node`. Draft
  [MODEL-revised-draft.md](../../../MODEL-revised-draft.md) is
  now fully resolved — all three open questions decided. SVG
  diagrams under
  [diagrams/model-revised-draft/](../../../diagrams/model-revised-draft/)
  match the resolutions. No code changes yet.
  [MODEL.md](../../../MODEL.md) is still authoritative until
  promoted.

  **What the resolved draft says.**
  - **Slot ownership.** The wire is transient
    (`empty → in-flight(v) → empty`); the slot lives on the
    destination node (`empty → filled(v) → consumed`). Wires
    arrive at the node carrying a bound slot id; the node writes
    its own slot.
  - **Q1 — tick driver.** Self-scheduling nodes + one global
    play/pause master switch. No central walker. A tick is one
    cohort of simultaneously-firing edges
    ([13-tick-as-edge-cohort.svg](../../../diagrams/model-revised-draft/13-tick-as-edge-cohort.svg)).
    Cohort N is assigned at wire-time by the regular animation
    loop; the gate releases cohort N only — random-access stepping
    over the cohort axis
    ([14-step-budget.svg](../../../diagrams/model-revised-draft/14-step-budget.svg)).
  - **Q2 — firing rule + slot ownership.** Slots are passive
    state; no subscription layer. Wire carries `(value, bound slot
    id)`; the node receives the arrival, writes the slot,
    re-evaluates its rule
    ([07-q2-firing-rule-and-slot-ownership.svg](../../../diagrams/model-revised-draft/07-q2-firing-rule-and-slot-ownership.svg)).
  - **Q3 — visual depiction.** Parked value renders on the dst's
    input port (small square). Wire renders only the in-flight
    pulse and is empty before/after
    ([05-q3-slot-visual-depiction.svg](../../../diagrams/model-revised-draft/05-q3-slot-visual-depiction.svg)).

  **Memories the resolved draft invalidates.**
  - `project_ack_is_wire_state` — the wire has no ack under the
    resolved model; backpressure lives in the slot's empty/filled
    state observed by the source.

  **CLAUDE.md sections that need rewriting.**
  - "Latch + AND gate backpressure pattern" — the latch + AND-gate
    wiring is the old shape; replace with the cohort-indexed
    self-scheduling story.
  - "Core concepts" — vocabulary check; some inhibitor-chain
    phrasing presumes the fused wire.

  **Gates:** all SVGs pass `xmllint --noout`. No code, so no
  build/tsc/vitest run. LOC ✓.

## Dev-loop

Read the resolved draft + diagrams. If aligned, promote
draft → MODEL.md, retire `project_ack_is_wire_state`, update
CLAUDE.md, then start code. First code touch should land the
slot-on-node + wire-bound-slot-id substrate change.

## Next move

See [handoff-next-task.md](handoff-next-task.md). The next concrete
step is promotion + retirement, not code.

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
