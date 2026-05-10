# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — **start here**
     for the next commit. Spec has been re-framed: wire-as-entity,
     not inbox-deferral. Read carefully — this reverses the prior
     cheap-fix framing.
  2. [handoff-step1-notes.md](handoff-step1-notes.md) — what was
     built on the rebuild branch (decision audit, coupling hacks
     gated to step 1, automated logging, e2e).
  3. [handoff-gate-a.md](handoff-gate-a.md) — earlier merge to main
     (Gate A).
  4. [handoff-rebuild-plan.md](handoff-rebuild-plan.md) — port plan,
     contracts R1–R5, auto-retire signal.
  5. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-09, thirty-fifth session):
  Active branch: `task/node-ticks`. Commit `f4c8d01`. **No new
  commits this session** — the work was a design conversation that
  reversed the previous session's framing. Branch state unchanged
  from prior handoff.

  **Key shift this session:** David named the recurring pattern
  explicitly. The same problem (wire is not a first-class entity)
  has been routed around through 5–7 substrate rewrites
  (legacy sim → wires → ack-driven → andGateLoop → step-function →
  pair → ticked → substrate-owned ticking). Each rewrote runner/node
  semantics and left wires as plumbing. Each "cheap fix" preserved
  the wrong model and compounded brittleness. The visual contract
  David has stated repeatedly — "pulse travels the wire, geometry
  cosmetic, traversal is one tick, edits don't break in-flight
  state" — implies wire-as-runner directly. The previously-recommended
  "defer ReadGate to next tick" was a near-miss that hides the model
  gap inside a receiver's inbox; reject it.

  Memory entry added:
  `~/.claude/projects/-Users-David-Documents-github-wirefold/memory/feedback_derive_model_from_visual_spec.md`.
  Future sessions will load it. Read it.

  Pre-existing red tests, still red, still not blocking:
  `shape-d-cycle.test.ts` (ackEdge race), `handle-load-repro.test.ts`.

  Carried context: Shape D self-pumps via `fb56c30`'s i1 fan-out +
  one-shot `seedLoop` + per-round `setTimeout(0)`. Manual-ack:
  [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md).

  Working tree: `topology.json` (`"runtime": "ticked"` flag for
  verification) and `topology.view.json` (camera drift) — editor
  state, intentionally not committed. Reference branches retained:
  `task/runtime-substrate-rebuild`, `task/wires`,
  `task/node-visuals-strip`. Do not delete.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher
fired` to Output → Log (Extension Host).

## Next move

**Make wire a first-class entity** (see
[handoff-next-task.md](handoff-next-task.md)). Wire owns state
`empty | carrying(v)`. Send transitions empty → carrying; recv
transitions carrying → empty. Each transition costs one tick.
Geometry (length, snake-routing, edits to path) is cosmetic and has
zero substrate consequence. The renderer reads wire state and draws
a dot while `carrying`; any motion between ticks is CSS transition
only. Strip `effectiveSpeedPxPerMs`, `simStart`,
`signalRendererComplete`, slot ledgers, `publishEdgeArrive` from the
ticked path — they are all artifacts of wire-as-plumbing.

Add a contract test before any implementation: wire state is
`empty | carrying(v)`, geometry changes do not affect wire state,
traversal is exactly one tick. Failing red enforces the spec across
sessions so it cannot be laundered into a cheap-fix framing again.

Dormant options (do not pursue ahead of wire-as-entity):
  - Triage pre-existing red tests.
  - Shape D port under manual-ack.
  - Uniform-node, timeout-removal.

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
