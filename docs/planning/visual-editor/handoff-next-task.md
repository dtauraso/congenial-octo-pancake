# Handoff — Next task (START HERE)

**State:** `task/node-ticks`. Shape D cycle is closed AND self-pumping
under option (c) (commit `fb56c30`): the cycle drives `readGate.chainIn`
and `readGate.ack` from i1's fan-out, in0 is a one-shot seed. Suite
green (259/259), tsc + build clean.

## What option (c) changed

**Wiring** ([runtime-wires-shape-d.ts](../../../tools/topology-vscode/src/substrate/runtime-wires-shape-d.ts)):

- in0 → `seedLoop(inWire, queue[0])`. Single send at startup; in0 no
  longer drives the cycle rate.
- readGate inputs both cycle-mode (`cycleMask: [true, true]`). Both
  feedback edges are consume-on-read.
- i0 uses `andGateLoopWithCycleInputs([outWire], [true], …)`. Forward
  edge is consume-on-read.
- i1 uses new `andGateLoopFanOut([cycleWire], [true], [ackWireE, inWire], …)`.
  Closes the cycle by broadcasting to both feedback edges.
- `selfAckEdges` lists all four cycle edges.

**Substrate** ([node-loop-cycle.ts](../../../tools/topology-vscode/src/substrate/node-loop-cycle.ts)):

- New `andGateLoopFanOut(inbound, cycleMask, outbound, reduce, opts)`.
- Fan-out yields **one `setTimeout(0)` per round-trip** at the top of
  each iteration. Load-bearing: with every edge consume-on-read, the
  cycle would otherwise pump entirely in microtasks and starve
  macrotasks (timers, animation frames, test ticks).

## Why option (c), not (a) or (b)

(b) — gating inputLoop on a downstream signal — was rejected: it
couples in0 to the cycle and destroys the AND's "two independent
arrivals" semantics at readGate.

(c) preserves the AND: in0 still independently delivers chainIn (just
once, as a seed); the cycle independently delivers ack via the
fan-out. readGate observes two distinct sources.

## What the next session might do

- **Run the editor and watch the self-pump** to confirm the visual
  layer behaves with the fan-out node. The tick counter and the
  per-edge selfAckEdges (visual auto-ack suppression) may need tweaks
  if pulses look off.
- **Shape C contract test** — still owed.
- **Delete unused `TriggerGate`** module if not needed.
- **Beyond Shape D:** the hierarchical chain (more inhibitors,
  partition nodes, AND-gate tree). The fan-out + cycle-input toolkit
  is now the substrate vocabulary for any closed cycle.

## Read before touching the cycle

- [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md) —
  external-acker assumption (still load-bearing for non-cycle edges).
- [handoff-cycle2-diagnosis.md](handoff-cycle2-diagnosis.md) — why
  feedback edges must be consume-on-read.
- The `setTimeout(0)` yield in `andGateLoopFanOut` — removing it
  reintroduces microtask starvation (OOM in tests).

## Working tree note

`.claude/settings.json` and `topology.view.json` may carry incidental
drift — leave or stash.

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
