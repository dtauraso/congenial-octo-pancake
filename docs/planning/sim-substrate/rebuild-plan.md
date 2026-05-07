# sim-substrate rebuild plan

Step 3 of the cheapest-path plan. Specifies what gets built on
`task/runtime-substrate-rebuild` after Gate A.

Scope was narrowed on 2026-05-07: the goroutine+scheduler and select
sketch pairs were dropped. Only the chan pair remains as visible-state
spec. See
[../../../memory/project_substrate_visual_vocabulary.md](../../../memory/project_substrate_visual_vocabulary.md).

## Visual layer

Two primitives. Nothing else.

1. **chan → wire.** A value moves along a wire from sender node to
   receiver node. Spec'd by the chan sketches:
   - [chan-anim.html](chan-anim.html) — motion view: token traverses
     the wire, arrives at receiver, receiver advances.
   - [chan-wire.html](chan-wire.html) — snapshot view: wire holds
     queued values, sender/receiver states visible.

2. **Per-node running indicator (with reloop).** A glyph on the node
   shows it is currently executing. The reloop variant shows a node
   that loops back on itself (its own output feeds its own input).
   This primitive is spec'd in prose only — no standalone sketch
   exists. It gets drawn for the first time in port-plan step 2 and
   is pinned by R5 (animation step = state transition) at that point.
   Treating prose-only as sufficient for Gate A is intentional: the
   shape is trivial (one glyph toggling on/off; reloop is a
   self-edge) and adding a sketch now would be ceremony.

That is the entire visual vocabulary. Goroutines and selects are not
separate visual primitives:

- A goroutine is "this node is running" — the activity indicator.
- A select is "this node is waiting on multiple incoming wires; one
  fires" — emergent from wire-firing + node-running, not a distinct
  shape.

If a future scenario seems to need a goroutine or select shape, that
is a scope expansion requiring explicit sign-off, not a default.

## Semantic contracts

Pinned by Go-side tests. No visual counterpart required — the visual
layer only has to faithfully render wire-firing order and
node-running state, not separately depict each contract.

| ID | Invariant |
|---|---|
| R1 | **Channel FIFO.** Values sent on a channel are received in send order. |
| R2 | **Select determinism.** When multiple cases are ready, the substrate picks the same case every run, given the same input. (See "select determinism choice" below.) |
| R3 | **Scheduler determinism.** Given the same initial state and inputs, the runner produces byte-identical step-by-step state. |
| R4 | **No goroutine runs twice per step.** Within one simulation step, each goroutine advances at most once. |
| R5 | **Animation step equals state transition.** Each visible animation frame corresponds to exactly one state transition; no frame folds multiple transitions, no transition is silent. Sub-frame tweening of a value's position along a wire (as in chan-wire.html's 720-step traversal) does not violate R5 — the state transitions are at the endpoints (sender shift, receiver push); the in-flight position is a continuous visual cue, not a state. |

Each contract gets a Go test under
`internal/substrate/contracts/` (or equivalent) before any port.

### Select determinism choice

The now-dropped select sketch used lowest-index. Go's runtime
randomises. For the substrate, **lowest-index** is the chosen rule:

- **Lowest-index** — trivial test stability, deterministic by
  construction, no PRNG seed plumbing. Picked.
- *Random (matches Go)* — rejected: would require seed plumbing for
  R3, and Go's randomisation exists to discourage select-order
  reliance, which we explicitly want to rely on.
- *Round-robin* — rejected: more bookkeeping, no advantage over
  lowest-index for our use.

R2's test pins lowest-index. If user code wants fairness, it composes
it explicitly above the substrate.

## Port plan

Pilot first, then bulk port.

1. **Stand up the chan→wire renderer** against a trivial two-node
   topology. No real topology code yet.
2. **Add the per-node running indicator + reloop** glyph.
3. **Write the R1–R5 contract tests** before porting any real
   topology code. Tests must be red until the substrate satisfies
   them.
4. **Pilot port: one inhibitor.** Port `ChainInhibitorNode` (or the
   smallest equivalent) onto the new substrate. Verify R1–R5 stay
   green.
5. **Bulk port** of remaining node types. Order by dependency: input
   sources → latches → inhibitors → detectors → gates → partitions.
6. **Delete the probe machinery** as contracts go green:
   `.probe/stuck-pulse-last.json` family,
   `.probe/runner-errors-last.json`, `RunnerProbe` toolbar latches,
   `window.__resetPulseLeak`.

Each step is its own commit on `task/runtime-substrate-rebuild`.

## Auto-retire signal for `task/in0-readgate-emission-ack`

Delete the parked branch (local + remote) on the **first green
rebuild contract test** (any of R1–R5). The parked branch's value is
"reference for the old shape" — once a rebuild contract is green,
the new shape is real, and the old reference is no longer needed.

No re-ask required for this delete; it is pre-authorised by this
plan.

### Buffered vs unbuffered channels

Substrate channels are buffered with a per-channel capacity (cap≥1).
Unbuffered (cap=0) is the edge case noted in chan-wire.html where the
"≥1 slot free" predicate becomes "receiver waiting right now."
Whether the substrate exposes cap=0 as a first-class option is
deferred to port-plan step 1 (renderer stand-up) — pick whichever
matches the smallest viable two-node topology and document the
choice in that commit. Not blocking for Gate A.

## Out of scope

- Visual primitives for goroutine lifecycle or select fan-in.
- Continuing to extend C6–C8 in
  [../visual-editor/contracts.md](../visual-editor/contracts.md);
  they are marked OBSOLETE.
- Self-cycling layer (sustained-activity mode). Build disruption /
  response first, per CLAUDE.md.

## Gate A → step 4

When this doc lands and is coherent with the chan sketches, Gate A
passes. `task/sim-substrate-sketches` merges to main, and
`task/runtime-substrate-rebuild` opens for the first commit (port
plan step 1).
