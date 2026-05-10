# Handoff — Next task (START HERE)

**State:** `task/node-ticks`, HEAD = `3a7ab45`. Wire-entity is
implemented at `src/substrate/wire-entity.ts` (52 LOC); all 5
contract tests green; substrate vocab lint clean. No consumer yet
adopts the new wire — it is a leaf module. Branch is **not** ready
to merge.

## Read MODEL.md first

[MODEL.md](../../../MODEL.md) at repo root pins the substrate model
in David's words and lists banned vocabulary. Read it before any
substrate or wire work. If your reasoning uses banned vocabulary
(duration, ms, schedule, deadline, speed, wall-clock, "tick takes
X"), you are in the wrong frame — stop and re-derive.

Run `node tools/topology-vscode/scripts/check-substrate-vocab.mjs`
to catch drift mechanically. 10 baseline hits exist in legacy files;
the refactor retires them.

## The model (do not paraphrase loosely)

- Substrate owns the tick. A tick is an ordinal count, not a slice of
  wall-clock time.
- One tick = every node runs one round; any pulse a node emits travels
  its wire to the destination within that round.
- Wire is a first-class entity. State: `empty | carrying(v)`. Not a
  queue. Not a buffer. One value or none.
- Geometry is cosmetic. Path length / snake-routing / edits affect
  only what is rendered. They do not affect wire state, tick count,
  or substrate correctness.
- Substrate halts and resumes pulses. That is all. No durations
  tracked anywhere. The substrate does not schedule, time, or wait on
  pulses.
- Renderer animates. It owns pixels and motion. It never signals back
  to the substrate.
- Tick close is event-driven: substrate observes wires returning to
  `empty`. It does not schedule the close.

Guardrails: `MODEL.md`, `check-substrate-vocab.mjs` lint, CLAUDE.md
"no plans-with-options for substrate/wire work" rule. Future sessions:
state next single concrete step and wait for sign-off.

## Next move — adopt wire-entity in one consumer

Contract test at
[test/contracts/wire-entity-contract.test.ts](../../../tools/topology-vscode/test/contracts/wire-entity-contract.test.ts)
is green. The wire API is `createWire(id) → { state, carry(v),
observe() }`; `carry` throws on non-empty. Three refinements (below)
are locked.

Next step: pick the smallest ticked-side caller and route its edges
through the new wire. Do **not** paraphrase the API into the legacy
inbox/edge-queue shape — if a call site needs a queue, the topology
needs a merge node. State the chosen consumer and wait for sign-off.

**Decided:** halt/resume lives on the **substrate**, not the wire.
MODEL.md frames halt as a substrate capability; `carrying(v)` is the
sole wire state axis. Halt = substrate stops advancing ticks; wires
freeze. Resume = next round runs, wires return to `empty`.

**Decided:** legacy runtime stays as a working museum until each
shape is ported to `substrate/ticked/` (currently only Shape A).
`check-substrate-vocab.mjs` gained `LEGACY_SKIP`; ticked side and
`wire-entity.ts` must stay clean. Port retires one skip entry.

**Decided:** `send()` on a non-empty wire **throws**. The wire has no
queue and no overwrite policy; two sends in one round is a topology
bug, not a runtime condition. Fan-in must be an explicit merge node.

Visuals (renderer) are also open per David — fine, substrate
contract is independent. Do not relax the test to pass.

## Refuse cheap alternatives

`feedback_derive_model_from_visual_spec.md` (in user memory) and
MODEL.md exist specifically to catch the failure mode where a
"smallest diff" preserves the wrong model. Read both. If the honest
implementation is large, say so plainly to David and get sign-off.

## Pre-existing red tests (carry over)

- `test/contracts/shape-d-cycle.test.ts` — ackEdge depth race.
- `test/contracts/handle-load-repro.test.ts` — real `topology.json`.

## Working tree at handoff

Unstaged (editor state): `topology.json` (`"runtime": "ticked"`),
`topology.view.json` (camera drift).

## ALWAYS clause

At end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
