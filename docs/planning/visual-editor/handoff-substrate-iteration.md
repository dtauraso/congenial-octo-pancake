---
# Substrate iteration model — closed

**Status:** decided. Runtime.ts port is unblocked. The model below
holds substrate timing-free per [MODEL.md](../../../MODEL.md);
pacing lives entirely in the renderer.

## The decision

**Forever-loop substrate.** Every node and every wire is its own
`while(running)` async loop. Coordination is backpressure at each
loop's `await` points. There is no outer step() iterator, no node
enumeration, no scheduler picking order.

- **Node loop (uniform, same body for every node):** await all input
  wires `carrying`, run, await all output wires `empty`, load output
  wires, await output wires acked.
- **Wire loop:** await source loaded me, await destination took me,
  ack source.
- **Network does the work, not the node.** AND, inhibition, latch,
  XOR are wiring patterns, not node subtypes. Node bodies are uniform.

## What this dissolves

- Order-dependent chain traversal — no iterator, no enumeration.
- Cycle-break rule — backpressure paces cycles natively (Shape D
  self-pump is the trivial case).
- Diamond fan-in / slot collision — each input port is its own wire.
- Stack-depth-equals-path-length — flat loops, no recursion.
- Once-per-tick enforcement — emergent from each loop awaiting ack
  before its next iteration.
- Two-tick latency smuggling — no tick as a substrate construct.

## Pause: line-level

Every wait is `Promise.race([stateChange, pauseSignal])`. On pause,
each loop parks at its current `await`; closure-captured local state
is preserved. On resume, parked promises unpark and loops continue
from the same line. Mid-rendezvous states (wire loaded, dest hasn't
taken) are valid frozen states.

Discipline: no bare `await` in loop bodies — every wait routes
through a pause-aware helper.

## No durations in substrate

Per MODEL.md: substrate halts and resumes pulses, that is all. No
step-duration awaits, no setTimeout, no scheduled pacing. Substrate
runs flat-out.

The renderer owns pacing. It subscribes to substrate state-change
events and plays them back at human-read speed, preserving order and
causal structure. Faithful = preserves what happened, not preserves
wall-clock. The renderer is the clock; the substrate is timing-free.

## State-change events

Substrate emits events on every transition (wire loaded, wire took,
node entered run, node parked, etc.) with ordinal sequence numbers
(not durations). Multiple subscribers attach independently:

- Renderer (live view at human-read speed).
- Recorder (appends events for replay/scrub/bug repro).
- Anything else (metrics, audits) without substrate awareness.

## What this does NOT fix

- Bad wiring still produces bad results — by design. Editor + audit
  registry catch it before run.
- Pre-existing red tests (`shape-d-cycle`, `handle-load-repro`).

## Implementation order

1. Extend `src/substrate/wire-entity.ts` with the wire's forever-loop,
   Promise-based waits (`awaitLoaded`, `awaitEmpty`, `awaitAcked`),
   pause-aware helper, state-change event emitter.
2. Pause controller as shared module.
3. Uniform node loop module (also emits events).
4. Renderer adapter subscribes to events; plays back at human speed.
5. Recorder subscribes (independent commit, whenever).

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
