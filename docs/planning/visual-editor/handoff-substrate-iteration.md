# Substrate iteration model — superseded layer

**Status:** the forever-loop substrate model below is preserved as
background, but the slot-in-node pivot has now been **resolved** and
supersedes parts of it. Read this file second, after
[handoff-next-task.md](handoff-next-task.md).

## What the resolved pivot changes about the model below

- **Slot vs. wire.** The wire is transient
  (`empty → in-flight(v) → empty`); the slot lives on the
  destination node (`empty → filled(v) → consumed`). Wires no
  longer "hold" a value; the parked state is node-side.
- **No wire ack.** Backpressure now lives in the slot's
  empty/filled state observed by the source, not in a separate ack
  channel on the wire.
- **Node body.** No longer "await inputs carrying, run, await
  outputs empty, await acked." Instead: receive wire arrival →
  write the bound slot id → re-evaluate the firing rule (defined
  by the node's kind) → if it fires, emit a pulse on the output
  wire.
- **Tick is observable, not imposed.** A tick is one cohort of
  simultaneously-firing edges (see
  [13-tick-as-edge-cohort.svg](../../../diagrams/model-revised-draft/13-tick-as-edge-cohort.svg)).
  Cohort N is assigned at wire-time by the regular animation loop;
  the play/pause gate can release cohort N only (random-access
  step).

## Background (preserved): forever-loop substrate

Every node and every wire is its own `while(running)` async loop.
Coordination is backpressure at each loop's `await` points. No
outer step() iterator, no node enumeration, no scheduler picking
order.

- **Pause: line-level.** Every wait is
  `Promise.race([stateChange, pauseSignal])`. On pause, each loop
  parks at its current `await`; on resume, loops continue. Now
  realized as the global play/pause master switch.
- **No durations in substrate.** Substrate halts/resumes pulses;
  no setTimeout, no scheduled pacing. Substrate runs flat-out.
- **Renderer owns pacing.** Subscribes to substrate state-change
  events; plays them back at human-read speed, preserving order
  and causal structure.
- **State-change events.** Substrate emits events on every
  transition (wire in-flight, slot filled, node fired, etc.) with
  ordinal sequence numbers. Multiple subscribers attach
  independently (renderer, recorder, audits).

## What this does NOT fix

Bad wiring still produces bad results — by design. The editor +
audit registry catch it before run. ParseSpec rejects wires whose
bound slot id doesn't exist on the destination node.

## ALWAYS clause

(See handoff.md — same clause applies.)
