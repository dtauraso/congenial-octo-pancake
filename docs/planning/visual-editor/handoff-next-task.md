# Next task: generalize manual-gate or pick up friction

**Branch:** none yet. `task/readgate-clear-button-gating` (which
supersedes `task/wire-slot-contract-audit`) is done — see handoff.md.
Awaiting sign-off + merge before opening the next branch.

## What just landed

A complete manual step-debug affordance for ReadGate, end to end:

- **Model:** ack is wire state, not a port. The slot lives inside
  the destination node; the wire transports the pulse. (See
  [memory/project_ack_is_wire_state.md](../../../memory/project_ack_is_wire_state.md).)
- **Substrate:** `Wire.clear()` escape hatch + `cleared` event;
  mid-flight clears wait for arrival.
- **Editor:** top-left ⌫ button on ReadGate nodes posts
  `clear-slot { nodeId, port }`; extension resolves the wire by
  edge target/handle and calls `clearWire`. Button is armed only when
  the input wire's frame phase === "loaded" (disabled on empty/taken)
  so users can't click on an empty slot expecting to start a pulse.
- **Runtime:** ReadGate is excluded from the generic auto-loop in
  `run-frames.ts` so its slot stays loaded until ⌫ is clicked. The
  host-shim now treats `cleared` like `acked` and emits an empty
  frame, so each ⌫ produces a clean empty→loaded transition the
  renderer can animate (one click = one pulse).

Live behavior: in0 sends pulse #1, slot holds, click ⌫ → next
pulse, etc., until the init queue is exhausted.

## Required next task — pick one

There is no single forced next step. Two reasonable directions; let
friction decide:

1. **Generalize the manual-gate pattern.** Right now ReadGate is
   hardcoded in two places: `run-frames.ts` (skip auto-loop) and
   `ClearSlotButton.tsx` (render only if type === "ReadGate"). If
   another node type needs the same affordance, lift this into a
   `manual: true` flag on `NodeTypeDef` and key both branches off
   it. Worth doing only when a second user shows up.

2. **Friction-driven next task.** Drive the editor with the new
   button, log surprises to
   [session-log.md](session-log.md), and open a `task/<short-kebab>`
   for the most pressing one. Candidates that surfaced recently:
   - Restart-Input friction (Input cycles once and stops — the ⌫
     button now makes "stops" visible; user may want a re-arm or
     loop affordance).
   - Identity body in `run-frames.ts:79-84` — once a non-readGate
     node needs real semantics, the body registry sketch in
     session-log applies.
   - Multi-slot wires / fan-in (currently `load` on non-empty
     throws with "fan-in must use an explicit merge node"; a merge
     node doesn't exist yet).

## Out of scope (until friction promotes them)

- Audit-style sweeps (see
  [audits.md](audits.md) for the registry).
- Generalizing `clear()` to wires that aren't input slots.
- A "step backward" affordance.

## Gates to clear before merge

tsc ✓, build ✓, vitest ✓, vocab gate ✓, LOC ✓.

## Dormant

- Identity body in `run-frames.ts:79-84` — every non-source,
  non-ReadGate node emits `vals[0]`.
- Shape D port; tick-batching audit superseded.
- Button node type — superseded by the editor-level ⌫ affordance.
- The `required` port-flag mechanism in `parse-meta.ts` — has zero
  callers now; kept for future required ports.

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
