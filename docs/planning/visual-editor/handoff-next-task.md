# No active task branch — next task: gated-input enforcement

**Branch:** none. Working tree on `main`, clean.

## Why this is the next task

ReadGate has two declared inputs in `NODE_TYPES.ReadGate`: `chainIn`
and `ack`. The current substrate (`runNode` / `awaitAll(awaitLoaded)`)
only parks on inputs that are **wired in the spec**, not on inputs
**declared in the schema**. Consequence: if a ReadGate is loaded into
the editor with only `chainIn` wired (the current `topology.json`),
the node takes chainIn immediately on every cycle and Input keeps
firing forever. The gating the user expects from the name "ReadGate"
isn't enforced anywhere.

The prior session (task/readgate-ack-button) attempted to fix this by
adding a Button node + ack edge, which works while wired but silently
regresses the moment a user deletes either. David rejected that
posture: "the stupidest and most fragile thing it can possibly do."
Branch was torn out. Feedback memory saved at
`memory/feedback_enforce_required_inputs.md`.

## Required next task

Add **schema-level required inputs** and validate at `parseSpec`:

1. Extend `Port` (in `schema/types-graph.ts` or wherever ports are
   typed) with `required?: boolean`. Default false.
2. Mark `ReadGate.ack` as `required: true` in `NODE_TYPES`.
3. In `parseSpec` (or a sibling validation pass it calls), reject any
   spec where a node has a declared `required` input with no incoming
   edge on that `targetHandle`. Error message names the node, port,
   and node type. parse failure should already disable the frame
   renderer cleanly (see `frame-renderer.ts:38`).
4. The current `topology.json` will fail parse after this change —
   that's the point. Either add a gating source for ack (Button node,
   Input node, whatever) in the same commit, or stage in two commits:
   validation first, fix the spec second.

## Out of scope (for this task)

- The Button node type and the manual-ack UX from the abandoned
  branch. Do not re-add it as part of this task. Once required-input
  validation is in, *then* decide whether the gating source should be
  a Button (manual), an Input (seeded), or something else. The
  enforcement comes first, the affordance second.
- Generalizing required-port enforcement to optional outputs, fan-out
  validation, etc. Stay scoped to required inputs.

## Gates to clear before merge

tsc ✓, build ✓, vitest ✓ (likely needs a new test for the parse-error
path), vocab gate ✓, LOC ✓.

## Dormant

- Identity body in `run-frames.ts:79-84` — every non-source node
  emits `vals[0]`. Real per-type semantics deferred until a node
  needs them (body-registry sketch in session-log).
- Shape D port; tick-batching audit superseded; restart-Input
  friction (input cycles once and stops — separate task whenever).
- The Button/manual-ack idea is parked, not killed. Revisit after
  required-input enforcement lands.

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
