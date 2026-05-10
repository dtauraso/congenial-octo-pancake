---
# Substrate iteration model — open

**Status:** open. The runtime.ts port (inbox-array → wire-entity) is
**blocked** on this. Do not port until David finalizes the round
mechanic.

## What this session established

The substrate model in [MODEL.md](../../../MODEL.md) was specified
against goroutines + channels. "One tick = every node runs one round;
any pulse a node emits travels its wire to the destination within
that round" is a **synchronization** claim under goroutines, not an
ordering claim. The channel send/recv is the round boundary for that
pair of nodes; there is no iterator and no "who runs first."

Single-threaded JS has no primitive that maps cleanly to "N
independent things, each blocked until their inputs arrive, all
advancing together when the round ticks." Any JS substrate must pick
a sequentialization, and every obvious sequentialization breaks
something the model promises.

## Locked this session

- **Each node runs exactly once per tick.** Hard constraint. Rules
  out multi-pass round mechanics.
- **Wire-level fan-in (two writers, one wire) is not user-authorable.**
  The visual editor enforces 1:1 wires by construction. `carry()`
  throwing on non-empty defends against code-side bugs (edgeId
  collision, same-node double-emit, port hazards), not topologies a
  user could draw. The "merge node for fan-in" framing applies to
  node-internal logic that wants to emit twice per round, not to user
  topology design.

## Rejected this session

Three loop-tweak options were proposed and rejected. They preserved
the wrong invariant (`step()` as a for-loop over nodes) instead of
deriving from the model:

1. **Topological order.** Sort nodes so sources precede destinations.
   Fails on cycles (Shape D self-pump).
2. **Multi-pass round.** Run nodes repeatedly until quiescent.
   Violates once-per-tick.
3. **Two-tick edge latency.** Source carries in tick N, destination
   observes in N+1. Contradicts "pulse traverses within one round."

All three came from anchoring on `runtime.ts`'s for-loop. They are
not a real exploration of the design space — they are the only
variations that preserve the loop, which is the wrong thing to
preserve.

## David's working direction (not finalized)

Nested loop: substrate → node → edges. A node is not "done" for the
round until its outgoing edges have finished delivering their pulse.
Mirrors goroutine `send-blocks-until-received` as structural
containment rather than parallelism. Substrate computes the whole
tick under the hood; renderer sees an atomic per-tick result.

Open shape questions inside this direction (do not pre-answer):

- Is "edge finished with the pulse" = value delivered to destination's
  input slot, or = destination has consumed it?
- Does `run()` precede the edge-walk, or interleave with it?
- For cycles: does the substrate-driven delivery fill the
  cycle-target's slot in the same round, or the next?

## Visual atomicity

Substrate's intra-tick sequentialization is invisible **iff the
renderer animates per-tick batches, not per-arrival.** Today the
renderer subscribes per-arrival but the runtime is fast enough that
arrivals share an animation frame. Latent leak. See
[handoff-tick-batching-audit.md](handoff-tick-batching-audit.md).

## What the next session should do

State the next single concrete step on the substrate iteration model
and **wait for David's sign-off**. Do not propose multi-step plans
with options. Do not start porting runtime.ts. The wire-entity leaf
module is fine where it is.

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
