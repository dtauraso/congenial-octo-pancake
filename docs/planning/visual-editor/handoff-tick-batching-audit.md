---
# Tick-batching audit (renderer)

**Status:** dormant. Trigger: a tick visually renders as a cascade
(node-by-node) instead of a parallel "everything fires at once."
Until that friction appears in real editor use, do not act.

## The question

The substrate is single-threaded JS; within one tick it must
sequentialize wire deliveries. The model says that order is invisible
— a tick is atomic, all pulses on it are simultaneous from the
renderer's view. That holds only if the renderer batches arrival
events by tick before animating.

If the renderer animates each `publishEdgeArrive` event as it lands,
the substrate's intra-tick ordering leaks into the visuals as a
cascade.

## Where to look

- Publisher: [src/substrate/node-streams.ts](../../../tools/topology-vscode/src/substrate/node-streams.ts)
  emits `publishEdgeArrive(edgeId, value)` and `publishTick(nodeId)`.
  Neither carries a tick number today.
- Consumer: [src/webview/rf/AnimatedEdge/_use-pulse-lanes-ticked.ts](../../../tools/topology-vscode/src/webview/rf/AnimatedEdge/_use-pulse-lanes-ticked.ts).
  Subscribes per-edge; on each arrival, appends a Pulse with
  `simStart: performance.now()` and starts its animation.
- Driver: [src/substrate/ticked/runtime.ts](../../../tools/topology-vscode/src/substrate/ticked/runtime.ts)
  — `step()` calls `publishEdgeArrive` inline during each node's run.

## Why it probably looks fine today

Shape A's `step()` finishes inside one animation frame, so all
arrivals from one tick share roughly the same `performance.now()` and
their CSS animations start together. The leak is latent: any future
work that makes a tick span multiple frames (heavier topology, async
node work, a slower step) would expose it.

## What "fixing it" would mean (do not do preemptively)

Two reasonable shapes if the friction appears:

1. **Tick-stamp arrivals.** `publishEdgeArrive` carries the current
   tick number. Renderer collects arrivals into a per-tick batch and
   flushes the batch on a `publishTickClose(tick)` event. All
   batched pulses get the same `simStart`.
2. **End-of-tick flush.** `step()` collects arrivals into a local
   buffer and emits them once, after all nodes have run. Subscribers
   receive an array per tick instead of one event per arrival.

(2) is smaller; (1) preserves per-event semantics for any consumer
that wants them. Pick based on what the consumer actually needs at
the time.

## How to know it's time

Drive the editor. Step a tick that fires multiple edges. If pulses
visibly start staggered — even slightly — the leak is real. If they
look simultaneous, leave it.

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
