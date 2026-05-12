# Next task: promote resolved substrate draft

**Branch:** `task/substrate-slot-in-node`.
**Status:** draft fully resolved. Three open questions decided. No
code yet. Ready to promote, retire stale memories, update CLAUDE.md,
then start code.

## What to read

1. [MODEL-revised-draft.md](../../../MODEL-revised-draft.md) — the
   now-resolved pivot. Each prior "Open question" is now a
   **Resolution** section with Properties / Cost. Read end-to-end;
   note this draft supersedes parts of MODEL.md.
2. [diagrams/model-revised-draft/README.md](../../../diagrams/model-revised-draft/README.md)
   — index of the diagrams (01–07 visualize the model; 13 defines
   tick = edge cohort; 14 shows cohort-indexed stepping).
3. [MODEL.md](../../../MODEL.md) — still authoritative until
   promoted; the resolved draft contradicts it.

## Resolutions in the draft

- **Q1 — tick driver.** Self-scheduling + one global play/pause
  gate. Tick = edge cohort
  ([13-tick-as-edge-cohort.svg](../../../diagrams/model-revised-draft/13-tick-as-edge-cohort.svg)).
  Cohort N is assigned at wire-time by the regular animation loop;
  gate releases cohort N only — random-access stepping
  ([14-step-budget.svg](../../../diagrams/model-revised-draft/14-step-budget.svg)).
  No central walker, no setup pass, no separate budget counter.
- **Q2 — slot ownership.** Slots are passive state on the node.
  Wires carry `(value, bound slot id)` set at construction time;
  on arrival the node writes the named slot and re-evaluates its
  rule
  ([07-q2-firing-rule-and-slot-ownership.svg](../../../diagrams/model-revised-draft/07-q2-firing-rule-and-slot-ownership.svg)).
  No subscription layer.
- **Q3 — visual.** Parked value renders on dst's input port; wire
  is empty after arrival
  ([05-q3-slot-visual-depiction.svg](../../../diagrams/model-revised-draft/05-q3-slot-visual-depiction.svg)).

## Concrete steps before code

1. **Promote draft → `MODEL.md`.** Either replace MODEL.md
   wholesale or merge in. Delete `MODEL-revised-draft.md` after.
2. **Retire memory** `project_ack_is_wire_state` — the wire has no
   ack under the resolved model; backpressure lives in the slot's
   empty/filled state, observed by the source.
3. **Update [CLAUDE.md](../../../CLAUDE.md)** — at minimum the
   "Latch + AND gate backpressure pattern" section. The latch +
   AND-gate wiring is the old shape; replace with cohort-indexed
   self-scheduling. Sanity-check the "Core concepts" vocabulary for
   fused-wire phrasing that drifted.
4. **Then start code.** First substrate touch: slot lives on the
   destination node; wires carry `(value, bound slot id)`; arrival
   writes the named slot. Gate + cohort registry can land in a
   second commit.

## Latent risk worth keeping in mind

The listener reentrancy hazard in the old fused-wire
`Wire.subscribePhase` path goes away under the resolved model
(no slot-side subscription at all). Until the new substrate is in,
treat any new `subscribePhase` listener as a hazard — they should
not be added; the migration path is to write the slot-on-node code
instead.

## ALWAYS clause

(See handoff.md — same clause applies.)
