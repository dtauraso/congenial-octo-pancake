# Next task: first code touch on slot-in-node substrate

**Branch:** `task/substrate-slot-in-node`.
**Status:** model promotion complete (commit 5f9ad30, pushed).
[MODEL.md](../../../MODEL.md) is authoritative. CLAUDE.md updated.
Invalidated memories retired/rewritten. **No substrate code changed
yet.** Ready to start code.

## What to read

1. [MODEL.md](../../../MODEL.md) — authoritative slot-in-node model.
   Pay attention to "What things are", "Who does what", and "Ticks
   and stepping".
2. [diagrams/model-revised-draft/README.md](../../../diagrams/model-revised-draft/README.md)
   — diagram index. Key visuals:
   - [07-q2-firing-rule-and-slot-ownership.svg](../../../diagrams/model-revised-draft/07-q2-firing-rule-and-slot-ownership.svg)
     — wire carries `(value, bound slot id)`; node writes the named
     slot and re-evaluates.
   - [05-q3-slot-visual-depiction.svg](../../../diagrams/model-revised-draft/05-q3-slot-visual-depiction.svg)
     — parked value on the destination's input port; wire empty
     before/after.
   - [13-tick-as-edge-cohort.svg](../../../diagrams/model-revised-draft/13-tick-as-edge-cohort.svg)
     + [14-step-budget.svg](../../../diagrams/model-revised-draft/14-step-budget.svg)
     — cohort = tick; gate releases cohort N only.

## First code commit (this session's target)

Land the model's minimum viable substrate shape:

- **Slot lives on the destination node** as passive state
  (`empty | filled(v) | consumed`). Node exposes
  `slotPhase(slotId)` and `fill(slotId, v)`.
- **Wire is transient** (`empty | in-flight(v) | empty`). Wire
  holds a construction-time binding to `(destNode, slotId)`. On
  animation completion, the wire calls `dest.fill(slotId, v)` and
  returns to `empty`. No `load`/`take`/`ack`.
- **parseSpec validation:** a wire whose `slotId` doesn't exist on
  its destination is rejected at parse time, not runtime.
- **Firing rule re-evaluates** on slot write. Auto destinations
  fire when precondition holds; manually-gated wait for the user
  click.

## Second commit (deferred)

Global play/pause gate + cohort registry. Cohort N assigned at
wire-time (max predecessor cohort + 1) by the regular animation
loop. Gate releases cohort N only for random-access stepping.

## Concrete starting steps

1. Locate the current substrate code path (likely under
   `tools/topology-vscode/src/substrate/` and
   `src/webview/substrate-r/`). Note: `check-substrate-vocab.mjs`
   currently reports "substrate/ directory not present" — confirm
   the actual location before editing.
2. Identify the existing `<Wire>` component and node base. Plan the
   minimal diff to retire `load`/`take`/`ack` and move the parked
   state onto the node's slot map.
3. Latent hazard: any new `subscribePhase` listener on wires is the
   wrong migration path under the resolved model. If you find
   yourself reaching for one, stop — write the slot-on-node code
   instead.

## ALWAYS clause

(See handoff.md — same clause applies.)
