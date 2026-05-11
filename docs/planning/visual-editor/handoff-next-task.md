# Next task: affordance for readGate1.ack

**Branch:** none yet. `task/wire-slot-contract-audit` is the active
branch but its scope (substrate slot-contract tests) is **done** —
see handoff.md. Awaiting sign-off + merge before opening the next
branch.

## Why this is next

Two layers have now landed:
- **Schema layer** (`task/readgate-required-ack`, merged): `Port.required`,
  `ReadGate.ack` marked required, `validatePorts` errors on missing
  required edges. Closes "ReadGate silently free-runs without ack" at
  parse time.
- **Substrate layer** (`task/wire-slot-contract-audit`, awaiting
  merge): three slot-contract rules from MODEL.md pinned by tests —
  send-on-non-empty throws, `taken → empty` is substrate-only, only
  `loaded` animates.

The live `topology.json` satisfies both layers because `ackSrc`
(Input) is wired to `readGate1.ack`. But `ackSrc` is a **placeholder**,
not a decided affordance. The required-input check is happy; the
question of *what should be driving the ack in practice* is unresolved.

## Required next task

Decide and wire the ack source. Three candidates:

1. **Button node (manual ack).** User clicks once per cycle. Good
   for stepping through the topology by hand; matches the
   originally-attempted `task/readgate-ack-button` direction. Needs a
   Button node type + view glyph + click→pulse plumbing.
2. **Seeded Input (current `ackSrc`).** Cheapest; the Input cycles
   once and stops (see "restart-Input friction" dormant). Becomes a
   no-op after the first cycle unless restart is fixed.
3. **Feedback loop from a downstream node.** The system acks itself
   when downstream consumption completes. Most faithful to a
   self-sustaining topology; requires picking the right downstream
   signal and being careful about cycle semantics under MODEL.md.

This is a UX/posture call, not a model call. The model and substrate
already enforce the contract; the question is which affordance best
fits the visual-editor posture (friction-driven, post-v0).

## Approach

- Open `task/<short-kebab>` once the affordance is chosen.
- Update the live `topology.json` / `topology.view.json` to reflect
  the choice; remove the `ackSrc` placeholder if it's no longer the
  decided source.
- If Button is chosen, add the node type behind the existing schema
  patterns (`NODE_TYPES`, `parse-meta.ts`, a view renderer entry).
- If feedback is chosen, document the cycle in MODEL.md before
  wiring — feedback edges interact with the slot contract.
- Add a contract test or live-spec test that proves the affordance
  works end-to-end with the required-input + slot-contract gates.

## Out of scope (for this task)

- Extending `required` enforcement to outputs, fan-out cardinality,
  or kind matching.
- Generalizing the substrate to multi-slot wires.
- Restart-Input friction as a generic fix (only address it if option
  2 is chosen).

## Gates to clear before merge

tsc ✓, build ✓, vitest ✓ (any new tests for the chosen affordance),
vocab gate ✓, LOC ✓.

## Dormant

- Identity body in `run-frames.ts:79-84` — every non-source node
  emits `vals[0]`. Real per-type semantics deferred until a node
  needs them.
- Shape D port; tick-batching audit superseded.
- Restart-Input friction — touched only if option 2 wins.

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
