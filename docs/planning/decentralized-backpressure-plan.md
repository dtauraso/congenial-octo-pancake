# Node-owned state invariant

Branch: `task/in0-readgate-emission-ack`

## The invariant

**A node's state is advanced only by the node itself, in response to
a local predicate it owns.**

Everything else in this plan is a consequence:

- **Back-pressure is automatic.** If a node can't advance (its
  downstream-ready predicate is false), it holds. No outside actor
  can force it.
- **Play/pause is one line.** Ticks are the only thing that drive a
  node to evaluate its predicate; pause stops ticks; state is
  preserved trivially because nothing else could mutate it.
- **No global scheduler is possible.** A scheduler would need to
  reach into nodes and advance them. The invariant forbids it.
- **Drain order across sources emerges.** Each node's predicate is
  independent; ordering is whatever locality produces.

This is the *only* architectural commitment. The taxonomy of node-
classes, the registry shape, the renderer hooks — all emerge as we
convert one node-class at a time and let pressure show us what's
needed.

## The trigger case

[in08](tools/topology-vscode/) has `data.init: [0, 1, 0]` but every
visible in0 pulse shows `value=0`. Cause: `step.ts` advances the
seed cursor unconditionally — outside-the-node mutation. emit.ts
then drops v=1, v=2 because cadence isn't ready, and the cycle
restart re-seeds to `0`.

This is a textbook invariant violation: `step.ts` advances state
that belongs to the Input node, without asking the node whether it
should. The fix is to give the Input node ownership of its cursor
and have `step.ts` ask, not push.

## What "node-owned" means in this codebase

The TS sim doesn't have node objects in the OO sense — state lives
in arrays/maps keyed by id, mutated by free functions in `step.ts`,
`emit.ts`, etc. We're not introducing classes. "Node-owned" means:

- **One module per node-class** owns mutation of that class's state.
  Other modules read but never mutate.
- **A node-class exposes a predicate** — "am I ready to advance?" —
  registered against a generic seam. The mutation site (`step.ts`)
  consults the predicate, never names the node-class.
- **Lifecycle hooks** (load, reset, pause/resume) go through the
  same seam: register/unregister predicates, never reach into state.

The registry is the seam. It is *not* a scheduler.

## Files in play

- [step.ts:44-47](../../tools/topology-vscode/src/sim/simulator/step.ts) —
  unconditional seed-cursor advance (first invariant violation)
- [emit.ts:27-48](../../tools/topology-vscode/src/sim/runner/emit.ts) —
  notify suppression (becomes redundant once Input owns its cursor)
- [in0ReadGateAck.ts](../../tools/topology-vscode/src/cadence/in0ReadGateAck.ts)
  — first concrete predicate, registered against the generic seam
- [cadence-back-pressure.test.ts:174-192](../../tools/topology-vscode/test/contracts/cadence-back-pressure.test.ts)
  — C10 contract test
- Renderer play/pause hook (located during chunk 4)

## Chunks

Each chunk lands as one commit. User signs off per chunk. The
ordering matters: the invariant is established before any node-class
is converted, and validated by play/pause before more node-classes
follow.

### Chunk 1 — Generic readiness seam

A node-agnostic registry:

```
register(nodeId, predicate)
unregister(nodeId)
ready(nodeId): boolean   // default true
```

Lives in its own module (e.g. `src/sim/readiness.ts`). Knows nothing
about Inputs, cadence, or any specific node-class. Pure
predicate-by-id table. This is the only seam through which the
mutation sites consult node-owned state.

### Chunk 2 — Input becomes the first node-owned class

Move seed-cursor mutation out of `step.ts` and into the Input
module. `step.ts` consults `readiness.ready(nodeId)`; if true, it
calls into the Input module to advance and produce the next emit.
If false, it does nothing for that source.

`in0ReadGateAck.ts` registers `() => mayEmit(sourceId)` as the
Input's predicate when the spec names it cadenced. On
`resetCadence`, unregister.

Invariants checked:
- Input with no predicate registered → behaves exactly as today.
- `step.ts` no longer mutates seed cursors.
- Multi-source → independent predicates, ordering emerges.
- Tight-loop guard: confirm `wasQuiescent` covers
  `runUntil`'s `maxSteps=100_000` when all sources stall, or add
  an explicit no-progress detector.

Test: 227/227 stay green.

### Chunk 3 — Remove redundant emit.ts suppression

The wire-level filter in emit.ts is dead code once chunk 2 lands —
the Input module never produces a notify the wire would need to
drop. Collapse to unconditional dispatch + `markEmitted` when
cadenced. Comment: "source held back at the node, never reaches the
wire."

Test: 227/227 stay green; visually verify in0 shows `0, 1, 0` paced
by cadence.

### Chunk 4 — Play/pause as the invariant's acceptance test

The invariant says ticks are the only thing that mutates node
state. Play/pause is the test: stop ticks, do nothing else, and
state must survive untouched.

Audit the existing pause path. Confirm (or make it true) that pause
does **not** call `resetCadence`, does **not** drain held cursors,
does **not** touch the registry. Resume re-enters the tick loop
with all per-node state intact.

If any sim-state mutation happens on pause/resume today, that is
itself an invariant violation — fix it here. This chunk grows or
shrinks based on what the audit finds.

Add a test: pause mid-cadence-cycle on seed `[0,1,0]`, resume,
assert the next emitted value is the held one — not a re-seed.

### Chunk 5 — Extend C10 for ordering + pause survival

In `cadence-back-pressure.test.ts`:
- Seed `[0,1,0]`, three full cadence cycles → FireRecords carry
  `[0,1,0]` in order.
- Between completions, `step()` produces zero new Input
  FireRecords (silent retry).
- Pause-resume preserves the held value.

### Chunk 6 — Inventory of remaining invariant violations

Now that the seam exists and one node-class owns its state, find
the others. Grep for code outside a node-class's module that
mutates that class's state — latches, partition cursors, cascade
counters, anywhere a free function in `step.ts` / `emit.ts` /
similar pushes into per-node arrays without consulting the node.

Output: a list, ranked by friction (which violation actually
causes a current bug or smell). Don't convert any of them in this
chunk. The user picks the next one, on its own branch.

### Chunk 7 — Handoff refresh

Rewrite [handoff.md](visual-editor/handoff.md): invariant stated,
seam in place, Input converted, play/pause invariant validated, C10
extended, inventory delivered. Branch ready to merge pending
sign-off.

## Open questions

1. **Tight-loop guard.** `wasQuiescent` vs explicit no-progress
   detector when every source stalls (chunk 2).
2. **Existing pause/resume side-effects.** Audit before chunk 4 —
   chunk grows if the renderer currently mutates sim state on pause.
3. **Predicate scope.** Per-node is enough today. If a future node-
   class needs per-edge predicates, extend then; do not pre-build.
4. **Read-only access.** The renderer needs to *read* node state to
   draw. The invariant forbids mutation, not observation. Confirm
   no current renderer path mutates while reading; flag any that
   does into the chunk-6 inventory.
