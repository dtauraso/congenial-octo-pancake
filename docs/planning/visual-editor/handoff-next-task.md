# Handoff — Next task (START HERE)

**State:** `task/node-ticks`, HEAD = `1c7e385`. Wire-entity is
implemented at `src/substrate/wire-entity.ts` (52 LOC); all 5
contract tests green; substrate vocab lint clean. No consumer adopts
the new wire — it is a leaf module. Branch is **not** ready to merge.

## Read MODEL.md first

[MODEL.md](../../../MODEL.md) at repo root pins the substrate model
in David's words and lists banned vocabulary. Read it before any
substrate or wire work. If your reasoning uses banned vocabulary
(duration, ms, schedule, deadline, speed, wall-clock, "tick takes
X"), you are in the wrong frame — stop and re-derive.

Run `node tools/topology-vscode/scripts/check-substrate-vocab.mjs`
to catch drift mechanically. Legacy hits are gated via
`LEGACY_SKIP`; ticked side and `wire-entity.ts` must stay clean.

## Next move — DO NOT port runtime.ts yet

The previous handoff said "adopt wire-entity in one consumer (smallest
ticked-side caller)." That guidance is **superseded**. Adopting
wire-entity in [src/substrate/ticked/runtime.ts](../../../tools/topology-vscode/src/substrate/ticked/runtime.ts)
forces a choice of round-mechanic semantics, and that choice is
**unresolved**. Three obvious options were rejected this session.

Read [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
**before proposing any next step.** It records:

- Why the model assumes goroutine concurrency that JS cannot supply
  natively.
- The hard constraint: each node runs exactly once per tick.
- The three rejected options (topo-order, multi-pass, two-tick
  latency) and why they are loop-tweaks anchored on the wrong
  invariant.
- David's working direction (nested loop substrate→node→edges) and
  the open shape questions inside it. **Not finalized.**
- Fan-in clarification: wire-level fan-in is not user-authorable;
  `carry()` throwing is code-side defense.

State the next single concrete step on the substrate iteration model
and wait for David's sign-off. Do not propose multi-step plans with
options. Do not start the runtime.ts port until David finalizes the
round mechanic.

## Decided previously, still hold

- Halt/resume lives on the substrate, not the wire.
- Legacy runtime stays a working museum; ports retire one
  `LEGACY_SKIP` entry at a time.
- `send()` on a non-empty wire **throws**. No queue, no overwrite.

## Refuse cheap alternatives

`feedback_derive_model_from_visual_spec.md` (in user memory) and
MODEL.md exist specifically to catch the failure mode where a
"smallest diff" preserves the wrong model. The three rejected loop-
tweaks above are exactly that pattern — they preserved the for-loop
and broke the model. If the honest implementation is large, say so
plainly to David and get sign-off.

## Pre-existing red tests (carry over)

- `test/contracts/shape-d-cycle.test.ts` — ackEdge depth race.
- `test/contracts/handle-load-repro.test.ts` — real `topology.json`.

## Working tree

Unstaged editor state: `topology.json`, `topology.view.json`.

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
