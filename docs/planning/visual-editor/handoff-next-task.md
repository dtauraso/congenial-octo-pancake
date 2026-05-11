# Next task: wire-primitive slot-contract audit

**Branch:** none yet. `task/readgate-required-ack` is the active
branch but its scope (required-input enforcement) is **done** — see
handoff.md. Awaiting sign-off + merge before opening the next branch.

## Why this is next

Required-input enforcement landed on `task/readgate-required-ack`:
`Port.required`, `ReadGate.ack` marked required, `validatePorts`
errors on missing required edges, live `topology.json` updated with
an `ackSrc` Input feeding ack. That closed the "ReadGate silently
free-runs without ack" hole at the schema level.

The next layer down is the **wire primitive itself**: even with a
required ack wired, the substrate has to honor the slot contract from
[MODEL.md](../../../MODEL.md) (Path A). The audit verifies that
contract is enforced mechanically, not just by convention.

## Required next task

Audit `tools/topology-vscode/src/substrate/` against the slot
contract. Add substrate-level tests covering:

1. **Send-on-non-empty throws.** A source attempting to load a wire
   already in `loaded` or `taken` state must throw — no queue, no
   overwrite, no silent drop. Test: drive `wire.send()` (or whatever
   the primitive entry point is) twice without an intervening
   destination consume; assert throw on the second call.

2. **`taken → empty` is substrate-only.** The transition from `taken`
   to `empty` does not round-trip through the renderer. Concretely:
   no renderer message is emitted on that transition; the source
   learns the slot is clear via the substrate back-channel. Test:
   spy the renderer message bus during a taken→empty transition and
   assert no `pulse-arrived` (or any) message fires for it.

3. **Only `loaded` traversal animates.** `taken` and `empty`
   transitions produce no pixels. Headless wires default
   `renderArrival: false`. Test: a headless wire's `loaded` phase
   does not emit `pulse-arrived`; an unheaded wire's does.

Pick the existing test pattern in `test/contracts/` (e.g.
`build-wire-entities.test.ts`, `node-loop.test.ts`) as the model.

## After the audit lands

Revisit the affordance question parked from the abandoned
`task/readgate-ack-button` branch: now that the model enforces
required ack, and the wire enforces the slot contract, decide whether
`readGate1.ack` should be driven by:
- a **Button** node (manual ack, user-driven cycling),
- a seeded **Input** (the current `ackSrc` placeholder),
- or something else (e.g. a feedback loop from a downstream node).

That decision is a UX/posture call, not a model call.

## Out of scope (for this task)

- Extending `required` enforcement to outputs, fan-out cardinality,
  or kind matching. Stay scoped to the three slot-contract rules
  above.
- The Button node type — still parked.
- Generalizing the substrate to multi-slot wires.

## Gates to clear before merge

tsc ✓, build ✓, vitest ✓ (new contract tests), vocab gate ✓, LOC ✓.

## Dormant

- Identity body in `run-frames.ts:79-84` — every non-source node
  emits `vals[0]`. Real per-type semantics deferred until a node
  needs them (body-registry sketch in session-log).
- Shape D port; tick-batching audit superseded; restart-Input
  friction (input cycles once and stops — separate task whenever).
- Button/manual-ack UX — revisit after this audit lands.

## ALWAYS clause

At end of session, overwrite this file (and the sibling `handoff-*.md`
files) with a freshly-rendered prompt tailored to the state you're
leaving the branch in, and commit on the active branch (main if no
task is in flight). Do not rely on chat history; the next AI may be a
fresh model with no transcript. The rendered handoff must itself
contain this same ALWAYS clause so the loop is self-perpetuating
across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md) as
the structural source of truth; update the template when an invariant
changes. Keep each file ≤100 LOC per the budget rule.
