# Substrate model — revised draft

Draft for review. Not yet authoritative. [MODEL.md](MODEL.md) remains
the source of truth until this is approved and promoted.

The pivot: today the substrate `<Wire>` owns the parked slot
(`loaded(v)` persisting after pulse arrival until `take`). Under the
revised model, the wire is transient — it carries a value to the
destination and becomes empty on arrival. The slot lives on the
destination node. Source nodes observe destination slot phase
directly, not through wire phase.

## What things are

- **Node.** Owns its `run()`, its output references (each = a pointer
  to a destination node + that destination's slot id), and a map of
  input slots indexed by slot id. Slots are the node's own state.
- **Slot.** A per-input cell on a destination node. Phase:
  `empty | filled(v) | consumed`. Phase is ordinal: filled happened,
  then consumed happened. No "during."
- **Wire.** Transient delivery + visual depiction. Phase:
  `empty | in-flight(v) | empty`. The wire carries a value from
  source to the destination's slot and then becomes `empty` again.
  The wire owns no parked state, no ack, no take.

## Who does what

- **Source node loads** by calling `dest.fill(slotId, v)` through its
  output reference. The wire enters `in-flight(v)` and animates. On
  animation completion the wire writes
  `dest.slot[slotId] = filled(v)` and returns to `empty`.
- **Source node observes readiness** by reading
  `dest.slotPhase(slotId)` directly through its output reference. It
  is free to load again when that returns `empty`. No wires involved
  in this observation.
- **Destination node consumes** its own slot by transitioning
  `filled(v) → consumed → empty`. Consumption is local: the firing
  rule reads the node's own slot map, decides to fire, transitions
  its slots, and calls `fill` on its own outputs.
- **Auto vs. manually-gated destinations.** An auto destination's
  firing rule fires the moment its precondition holds (e.g. all
  slots filled). A manually-gated destination's firing rule
  additionally waits for a user click. The slot stays `filled(v)`
  until the rule fires.

## Geometry and time

- Wire geometry sets `in-flight(v)` traversal time:
  `inFlightTime = arcLength / pulseSpeed`. No other substrate effect.
- Geometry change while `in-flight(v)` re-derives remaining traversal
  time from new arc length and distance already covered. If the new
  arc length is below distance covered, the wire completes
  immediately (writes the slot).
- Phase is otherwise ordinal. The substrate tracks no other
  durations.

## Tick close

A round ends when every wire is `empty` AND every node's firing rule
has had the chance to run on its current slot state. The substrate
observes this; it does not schedule it. A slot in `filled(v)` waiting
for a manually-gated destination continues to wait — halt/resume does
not abort it.

## React surface realization

- **`<Wire>`** renders the SVG path and runs the RAF pulse animation
  while in `in-flight(v)`. Exposes no `load`/`take`/`ack`. Its only
  substrate side-effect is calling `dest.fill(slotId, v)` on
  animation completion.
- **`<Node>`** owns its slot map, exposes `slotPhase(slotId)`,
  `fill(slotId, v)`, and its firing rule. Manually-gated nodes
  render a take affordance whose click invokes the firing rule with
  the user-gate satisfied.
- **`useTickDriver`** walks nodes per round, observes wire cycle
  completion, increments tick. No wall-clock scheduling.

## Banned vocabulary (revised)

Drop from MODEL.md's current list: `loaded(v)` and `taken(v)`
(replaced by slot phases). Keep: all timing/scheduler bans. Add:
"wire holds the value past arrival" — under the revised model the
wire is transient.

## What this retires

- The current `<Wire>` fused phase + animation object.
- The `take` and `ack` signals as wire concerns.
- The `ack-is-wire-state` memory.
- The latch + AND-gate backpressure pattern as currently described
  in CLAUDE.md, which assumes wire phase carries the parked state.
  Backpressure now lives in source nodes reading `dest.slotPhase`
  directly.

## Open questions

### Q1. Tick-driver shape under slot-in-node

Today `useTickDriver` walks every node per round, calls `run()`, and
observes wire cycles to detect round close. Under the revised model
slots live on nodes and source nodes observe destination slot phase
directly — which means a node could in principle fire reactively the
moment its precondition holds, without a central walker waking it.

**Option A: keep central walker.** The driver continues to walk nodes
once per round and call `run()`; nodes inspect their own slots and
act.
- *Pros:* Tick ordinality stays crisp — "round N happened, then N+1
  happened." Halt/step semantics are unchanged. Ordering across
  nodes is deterministic and observable from one place. Matches the
  current React surface realization.
- *Cons:* Nodes are polled even when nothing changed for them. The
  driver still needs to know about both wire-cycle completion *and*
  node-firing completion to detect round close, which is a slightly
  richer condition than today.

**Option B: self-scheduling nodes.** Each node subscribes to its own
slot map; when the precondition holds, it fires. No central walker.
- *Pros:* Nothing happens when nothing changes — matches the project
  thesis that "topology IS the logic" and work emerges from wiring.
  Less driver code.
- *Cons:* Tick ordinality becomes fuzzy — what defines round N vs.
  N+1 if there's no walker? Halt/step becomes harder (you'd have to
  pause all node subscriptions). Reentrancy risk balloons: a node
  firing changes a destination slot, which fires the next node, all
  synchronously in one turn — the same shape as the latent
  `phaseListeners` reentrancy risk today, but everywhere.

**Tentative lean:** A. Keep the walker. Self-scheduling sounds
aesthetic but the loss of ordinal tick semantics is a real cost,
and MODEL.md's existing tick discipline is load-bearing.

### Q2. How a firing rule subscribes to its own slot map

A node's firing rule needs to re-evaluate when its slots change. Two
shapes for that subscription:

**Option A: per-slot listeners.** Each slot is its own observable.
The firing rule registers one listener per slot it cares about.
- *Pros:* Precise — the rule only re-evaluates when a slot it
  actually depends on changes. Maps cleanly onto fine-grained
  reactivity patterns React users already know.
- *Cons:* N subscriptions per node, more bookkeeping at
  mount/unmount. Each listener is its own reentrancy hazard —
  exactly the shape of today's `Wire.subscribePhase` risk, just
  multiplied across slots.

**Option B: one node-level revision counter.** Any slot change
increments a single counter on the node. The firing rule subscribes
once to that counter.
- *Pros:* One subscription per node, simpler bookkeeping. Easier to
  bound reentrancy — one notification per slot change instead of
  one per listener per change. Easier to debug: you can log every
  rule re-evaluation in one place.
- *Cons:* The rule wakes on every slot change, even ones it doesn't
  care about. For nodes with many inputs and partly-independent
  preconditions this is mildly wasteful — but the rule body is cheap
  and the savings of A rarely matter in practice.

**Tentative lean:** B. Single counter. The reentrancy and
debuggability wins are concrete; the precision loss is hypothetical.

### Q3. Visual depiction of slots

Today the parked value is drawn as a circle at the destination end
of the wire ([Wire.tsx:112-125](tools/topology-vscode/src/webview/substrate-r/Wire.tsx#L112-L125)). Under the revised model the slot
lives on the node, not the wire, so there's a question of whether
the visual should follow.

**Option A: slot visualized on the destination node.** A small
indicator on the destination's input port that fills when the slot
is `filled(v)` (and possibly shows the value).
- *Pros:* The visual matches the new ownership — anyone reading the
  diagram sees "the value is parked at the node, not on the wire."
  The model change is legible at a glance. Distinguishes in-flight
  (on the wire) from parked (on the node) clearly.
- *Cons:* More elements per node; node bodies get visually busier.
  The SVG style guide and `diagrams/` reference SVGs need updating.

**Option B: keep the parked circle at the wire's destination end.**
Visually nothing changes; the dot still appears where it does today.
- *Pros:* Minimal visual disruption; user keeps the existing mental
  picture. No diagram updates.
- *Cons:* The visual contradicts the model. The dot *looks* like
  it's on the wire, but under the revised model the wire is empty
  after arrival — the dot represents node slot state being drawn at
  a wire-adjacent position for layout convenience. Future readers
  will keep re-deriving the wrong ownership from the picture.

**Tentative lean:** A. The whole motivation for the model change is
that fusing concerns causes confusion; preserving a visual that
fuses them again undermines the point.
