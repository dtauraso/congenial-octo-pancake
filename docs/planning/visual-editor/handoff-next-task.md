# Handoff — Next task (START HERE)

**State:** `task/node-ticks`, commit `f4c8d01`. No new commits this
session. Substrate-owned ticking from prior session is intact;
wire pulses still render via wall-clock-timed `usePulseLanesTicked`.
Build green. Branch is **not** ready to merge.

## Framing reversal — read this carefully

Prior handoffs recommended "defer ReadGate consumption to next tick"
as the next move. **Reject that.** It is a cheap fix that preserves
the wrong model. This session's design conversation made the spec
explicit and the model gap unavoidable.

David's visual contract (stated repeatedly, including this session):
  - Pulse travels along the wire.
  - Length, shape, and edits to wire geometry are cosmetic.
  - Traversal of any single pulse is one tick, regardless of length.
  - Pulse must be visible in the viewer (not just code state).
  - Changes to one thing must not break in-flight pulses.

These constraints imply wire-as-entity directly:
  - "Pulse travels the wire" → wire holds the pulse, not a node.
  - "Geometry doesn't affect timing" → traversal duration is
    independent of path → fixed unit (one tick).
  - "Edits don't break in-flight state" → wire's state survives
    geometry changes → wire owns its own state.

The same shape of bug has surfaced across 5–7 substrate rewrites
because each rewrite fixed runner/node semantics and left wires as
plumbing. The next session must stop rewriting substrates and
rewrite the wire instead.

## Next move — wire-as-entity

1. **Contract test first.** Write a failing red test that pins the
   spec: wire state is `empty | carrying(v)`; send transitions
   empty→carrying; recv transitions carrying→empty; each transition
   is one tick; geometry changes do not affect wire state. This
   artifact is what enforces the spec across future sessions.
2. **Introduce `WireRunner`** (or equivalent — the name is open).
   Wire is a tickable entity registered with the substrate. Its
   inbox is the sender's outbox; its outbox is the receiver's inbox.
   Or: collapse inbox/outbox into wire state directly. Pick whichever
   keeps the substrate simpler.
3. **Renderer reads wire state.** AnimatedEdge subscribes to the
   wire's state and draws a dot while `carrying`. Motion between
   ticks is a CSS transition keyed on tick number — purely cosmetic.
   Click ⏭ before the transition completes → snap to next state.
4. **Strip wire-as-plumbing artifacts** from the ticked path:
   `effectiveSpeedPxPerMs`, `simStart`, `signalRendererComplete`,
   per-edge slot ledger, `publishEdgeArrive` pubsub, the
   wall-clock-timed `Pulse` object spawned by
   `_use-pulse-lanes-ticked.ts`.

## Refuse cheap alternatives

If the implementation feels like "smallest diff that makes the
visible symptom pass," stop. That framing is the failure mode that
produced the prior 5–7 rewrites. The memory entry
`feedback_derive_model_from_visual_spec.md` exists specifically to
catch this. Read it before patching.

If the honest implementation is large, say so plainly to David and
get sign-off before proceeding. Do not substitute a near-miss.

## Pre-existing red tests (carry over)

- `test/contracts/shape-d-cycle.test.ts` — ackEdge depth race.
- `test/contracts/handle-load-repro.test.ts` — real `topology.json`.

## Working tree at handoff

Unstaged (editor state, not committed): `topology.json`
(`"runtime": "ticked"`), `topology.view.json` (camera drift).

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
