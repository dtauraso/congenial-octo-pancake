# Handoff — Next task (START HERE)

**Branch:** `task/node-ticks` (active, not merged). Three commits on
top of `main` (`8daf317`):

- `6554e07` — `subscribeNodeTicks(fn)` on wires runtime. `node-loop`
  fires `onTick` after each Input send and after each ReadGate
  arrive. Contract test asserts tick count >= ack-cycle count.
- `33fe174` — visual #1 (flash) restored, driven by
  `subscribeNodeTicks`.
- `54cd832` — visual #2 (glow ring) restored, same trigger.

User-confirmed visually: flash + glow fire on both Input and ReadGate
per pulse; rapid retrigger clean; pause behaves per design.

**Next: visual #3 (held tint).** Recolor node fill by held value
(`+1` → `#ffab40`, `−1` → `#66bb6a`, else `data.fill`), with a
CSS `transition: background-color ${tweenMs}ms linear` tween. Source
in [../sim-substrate/removed-node-visuals.md](../sim-substrate/removed-node-visuals.md)
section 3.

The legacy version read `world.state[id].held` from `sim/runner`. The
wires runtime doesn't expose held values yet — this needs a new
substrate signal first.

## Suggested next commits

1. Add `subscribeNodeHeld(fn: (nodeId, value) => void)` to
   [runtime-wires.ts](/tools/topology-vscode/src/substrate/runtime-wires.ts).
   Producer: `node-loop.ts` publishes from `readGateLoop` on arrive
   with the `StateValue` carried by the wire. Input side has no
   "held" — only emit for receivers. Contract test: held value matches
   the most-recently-arrived wire value for that node.
2. Restore visual #3 (held tint) on AnimatedNode using
   `subscribeNodeHeld`. Restore the `StateValue` import. One commit.
3. Then visual #4 (buffered halo) — needs wire `state === "full"`
   info; design that signal in its own commit (likely
   `subscribeNodeBuffered(fn)` or read off the WireMap directly).

## Open question for next session

Should `subscribeNodeHeld` fire only on change, or on every arrive?
The legacy code recomputed on every fire; firing on every arrive
matches that. Tween only triggers if the value actually changed —
React equality on `held` state handles it.

## Branch / scope

Stay on `task/node-ticks`. Trivial Input→ReadGate is still the only
topology. Merge to `main` once all four visuals are restored, or
sooner if a natural breakpoint emerges.

## Working tree note

`topology.view.json` shows incidental pan/zoom drift after editor
sessions. Leave or discard; not part of any commit.

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
