# Handoff — Next task (START HERE)

**State:** `task/node-ticks`. Shape A's per-node `prevSlotEmpty` rule
landed on the step-substrate Input but **did not change visible
cadence** — pulses still stack. Diagnosis session reframed the
problem: do not patch the rule, do not patch the step substrate.
Build a new minimal shape that bypasses both.

## Why a new shape

Step substrate (same-tick drain) and retired Promise/await substrate
share one failure: writer and reader collapse into one
indistinguishable instant — no observable "occupied" phase. The
`prevSlotEmpty` rule cannot gate what isn't observable. CLAUDE.md
medium-vs-substance names this. Build the smallest substrate where
the phase is real.

## The minimal shape

Two nodes, two wires, no ticks, no `await`, no driver:

- `wForward: in0 → readGate` (cap 0) — carries the value; this is
  the wire the editor animates as a pulse.
- `wPermit: readGate → in0` (cap 1) — carries a "go" token.

Loops are **callback state machines** driven by wire events
(`onArrive`, `onAck`, `onValueChange`). No `await` in the node
bodies. The only "time" in the system is the pulse traversing the
arc on screen — that physical event drives `ackWire(wForward)` via
the existing `usePulseLanesWire` listener, which then triggers
readGate's `onArrive`-handler to send the next permit.

Sketch:

```
in0 state: waitingPermit | readyToSend
  wPermit.onArrive → consume permit, wForward.send(value)
  (no await; send is sync, ack arrives later via callback)

readGate state: waitingValue | working | readyToPermit
  wForward.onArrive → run readGate logic synchronously,
                      ackWire(wForward) is called by the visual
                      layer on pulse arrival, then send wPermit("go")
```

One pulse on screen at a time. Cadence = arc traversal time. No
flag, no counter, no FRAME_MS.

## Where it lands

- New `substrate/runtime-wires-pair.ts` exporting
  `setupInputReadGatePair(...)`. Sibling to existing shape setups.
- New match case so this topology routes here, **not** through
  `step/`. Leave `step/` in place but dormant — Shape A's machinery
  is reference, not active.
- Animation layer: no changes. `usePulseLanesWire` already does the
  right thing on `wForward`. `wPermit` need not animate (or render
  later as a faint return arrow).

## Diagnostic value

If pulses space cleanly under the pair shape, the step substrate's
tick/drain ordering was the source. If they still stack, the bug is
in the visual layer (geometry/lanes), not the substrate — and we
investigate
[_use-pulse-lanes-wire.ts](../../../tools/topology-vscode/src/webview/rf/AnimatedEdge/_use-pulse-lanes-wire.ts)
without the step substrate confounding the picture.

## Open question for next session

Should `wPermit` carry the value back (so readGate's logic can
depend on what it received) or just an opaque "go" token? Defer
until a single pulse round-trips cleanly.

## On hold until the pair shape reads as discrete arcs

- Shape D port and uniform-node work
  ([handoff-shape-d-plan.md](handoff-shape-d-plan.md),
  [handoff-timeout-removal.md](handoff-timeout-removal.md),
  [handoff-uniform-node-plan.md](handoff-uniform-node-plan.md)).
- Shape C contract test.

## Working tree

`.claude/settings.json`, `topology.view.json`, plus pre-existing
edits to `runtime-wires-shapes.ts` +
`test/contracts/runtime-wires-manual-ack.test.ts` — leave or stash.

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
