# Handoff — Next task (START HERE)

**State:** `task/node-ticks`, HEAD = `d4fb0a6`. Red contract test
for wire-as-entity has landed (5 tests, all red as designed).
Substrate-owned ticking from prior session is intact; wire-entity
implementation not started. Branch is **not** ready to merge.

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

## Why this re-framing matters

Prior sessions kept reaching for timing vocabulary (durations,
ms-per-pixel, scheduled tick boundaries, renderer-signals-complete).
Each was the industry-default answer for the medium and the wrong
answer for the substance (CLAUDE.md "Medium vs. substance"). This
session pinned the model and added guardrails:

- `MODEL.md` at repo root.
- `tools/topology-vscode/scripts/check-substrate-vocab.mjs` lint.
- CLAUDE.md top-of-file pointer + "no multi-step plans with options
  for substrate/wire work" rule.

Future sessions: do not propose plans-with-options for substrate or
wire work. State the next single concrete step and wait for sign-off.

## Next move — wire-as-entity (refinement still open)

Red contract test has landed at
[test/contracts/wire-entity-contract.test.ts](../../../tools/topology-vscode/test/contracts/wire-entity-contract.test.ts).
It pins three claims and is intentionally red:
- state shape `empty | carrying(v)` (no queue/buffer/length/inFlight/ready/duration)
- geometry edits do not mutate state
- `check-substrate-vocab.mjs` exits clean (currently 10 baseline hits)

Implementation (`src/substrate/wire-entity.ts` + retiring legacy
substrate vocabulary) is **blocked on two open refinements**:

1. Is the legacy non-ticked runtime (`runtime-wires.ts` await/Promise
   path) dead/removable, or must it keep working?
2. Multiple sends to the same wire in one round: error, or
   last-write-wins? `carrying(v)` holds one value.

**Decided (this session):** halt/resume lives on the **substrate**,
not the wire. Rationale: MODEL.md frames halt as a substrate
capability ("the substrate halts and resumes pulses"); `carrying(v)`
already fully describes wire state, and adding a `halted` flag would
be a second state axis the model does not have. Halt = substrate
stops advancing ticks; wires keep `carrying(v)` frozen because nothing
runs. Resume = next round runs, pulses arrive, wires return to
`empty`.

Visuals (renderer) are also open per David — fine, substrate
contract is independent. Do not start implementation until David
signs off on (1)–(3). Do not relax the test to pass.

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
