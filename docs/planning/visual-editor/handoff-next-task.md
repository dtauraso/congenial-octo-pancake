# Handoff — Next task (START HERE)

**Continue revised step 1: per-node loop runtime on the new Wires.**
Spec is at
[../sim-substrate/revised-step-1.md](../sim-substrate/revised-step-1.md).
Commit 1 (Wire primitive + buildWires + contract test) landed at
bf340d7. Files: [src/substrate/wire.ts](/tools/topology-vscode/src/substrate/wire.ts),
[src/substrate/build-wires.ts](/tools/topology-vscode/src/substrate/build-wires.ts),
[test/contracts/wire-primitive.test.ts](/tools/topology-vscode/test/contracts/wire-primitive.test.ts).
Nothing else in the repo touches them yet.

**Commit 2 (next):** substrate runtime — per-node async loops that
read inbound `Wire`s and write outbound. Two loops for Input→ReadGate.
No legacy coupling: no `legacyRunnerState`, no `event-bus`, no
`pulse-concurrency`. Use `ackWire` from wire.ts on the receive side.
Keep ≤100 LOC per file (split if needed).

## Why this exists (the short version)

Original step 1 stood up a substrate that animates, but it rides the
**legacy global event bus** (`sim/event-bus`), the **legacy sim
clock** (`legacyRunnerState`), and the **pulse-concurrency ledger**.
The chan sketches don't have any of those — they have point-to-point
sender→wire→receiver. Layering on shared mailboxes produced the
stuck-pulse-on-load bug class; the dedup we removed in 7c59101 was
masking it, not fixing it. The real fix is to retire the global
scheduling system.

The user explicitly chose to defer all visual validation until global
scheduling is gone. Don't ask for editor checks mid-stream — push
through to "no global scheduling left," then hand back.

## Branch

This is `task/wires`, cut from `task/runtime-substrate-rebuild` at
1aeee65. Fresh branch on purpose: the architectural reset is
non-trivial and the prior branch's commits are "what we tried first."
`task/runtime-substrate-rebuild` stays as reference; do not delete.

## Scope of this stretch (~$150–250)

User has signed off on:
- **Trivial topology only.** Keep Input→ReadGate as the only test
  case through this whole stretch. Don't port more node types than
  needed to prove the legacy runner is dead.
- **One-node-at-a-time bulk port comes after**, not now. That's
  steps 4–5 territory and stays separate.

Endpoint that earns the user's eyes again: revised step 1 done,
plus enough of steps 4–5 to retire `sim/event-bus`,
`legacyRunnerState`, and `pulse-concurrency`. Then hand back.

## Concrete commits (remaining)

1. ✅ bf340d7 — `Wire` type + builder + contract test.
2. Substrate runtime: per-node loops reading inbound / writing
   outbound. Two loops for Input→ReadGate.
3. Rewire `AnimatedEdge` to read its `Wire` via context (or RF edge
   data — context is cleaner; fall back if RF fights).
4. Toolbar play/pause toggles a per-runtime flag, no
   `legacyRunnerState` coupling.
5. Once the new path is alive on the matched topology, start ripping:
   `_resetPulseConcurrency` calls in [runtime.ts][rt],
   `legacyRunnerState.{playing,simSegmentStartWall,simAccumMs}`
   coupling, then the `sim/event-bus` substrate-side usage.

[rt]: /tools/topology-vscode/src/substrate/runtime.ts

## Open questions (decide during implementation)

1. **Wire owns its arc timer, or visual layer does?** Sketches put
   it on the wire. Default to that unless R5 gets awkward.
2. **Pause semantics?** Either wire freezes mid-arc, or runtime
   stops calling `send` (in-flight finishes, no new sends). Latter
   is simpler.
3. **RF edge data vs context for handing Wire to AnimatedEdge?**
   Context is cleaner; fall back to edge data if RF fights.

## Recently landed on `task/runtime-substrate-rebuild` (now reference-only)

- 7c59101 — dropped module-level `lastLoadedText` dedup; cold-open
  + rename-triggered reloads animate cleanly without it. Confirmed
  by user this session: 11/00 leading-pulse patterns are gone.
- 1aeee65 — disabled periodic-checks auto-triggers (only
  `workflow_dispatch` now); cuts CI failure-email noise during the
  rebuild. Restore schedule/push/PR triggers when this lands on
  main.

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
