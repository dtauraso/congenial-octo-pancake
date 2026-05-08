# Handoff — Next task (START HERE)

**State:** `main` at `392602f`. `task/node-ticks` at `1a918b1`
(pushed, not yet merged) carrying two pause-freeze remount fixes,
the Wire ready/value back-channel API, and now the first two
consumer commits: `inputLoop` gates on `awaitReady`, and a generic
`andGateLoop` primitive lives in `src/substrate/node-loop.ts`.

## What's done

- Visuals 1–4 on the wires runtime (flash, glow, held, buffered).
- Pause = mid-arc freeze; concurrent clocks frozen on command.
- Pause-freeze survives PulseInstance remount (`a0260fb`,
  `e5b20d7`).
- Wire gained predictive back-channels (`4827ea2`):
    - sender side: `ready`, `onReadyChange(fn)`, `awaitReady()`
    - receiver side: `hasValue`, `onValueChange(fn)`, `awaitValue()`
- `inputLoop` now does `awaitReady` then `send` (`d01973e`).
- `andGateLoop(inbound[], out, reduce)` primitive (`1a918b1`):
  Promise.all(awaitValue) → reduce → awaitReady → send → ackWire
  each inbound. Stop uses a per-iteration wake race (don't
  resurrect the long-lived-stop-signal pattern — V8 leaks reaction
  records). 248/248 green; tsc + build clean.

## What the next session should do

Land the **first multi-input node port** that actually wires
`andGateLoop` into `runtime-wires.ts`. Steps:

1. Pick a target node — `ChainInhibitorNode` is the most natural
   (the topology's whole point). A two-input AND would also work
   as a proof of concept. Either way it's a real port, not a
   primitive.
2. Widen `matchSubstrate` (`src/substrate/match.ts`) to admit the
   chosen topology. Keep it strict — silent broadening masks bugs.
3. Wire it in `startWiresRuntime`: build inbound + outbound wires
   per node, instantiate `andGateLoop` with the node's reduce
   semantics, publish ticks/held/buffered the same way the
   Input→ReadGate path does.
4. Add an end-to-end test that drives the topology and observes
   the wire cycle.

Coordinate with port-plan steps 4–6 in
[../sim-substrate/rebuild-plan.md](../sim-substrate/rebuild-plan.md).

## What's NOT done (and why it's parked)

- Legacy globals (`sim/runner`, `sim/event-bus`, `legacyRunnerState`,
  `pauseRunner`, `isPlaying`) still imported by AnimatedEdge,
  PulseInstance, TimelinePanel, Bookmarks, RunnerProbe,
  fold-halo-probe, `_handle-load`, `_on-node-drag`. Removing them
  is gated on the multi-input node port above.

## Working tree note

`.claude/settings.json` and `topology.view.json` carry orthogonal
uncommitted drift. Leave or stash.

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
