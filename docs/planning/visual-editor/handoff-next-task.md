# Handoff — Next task (START HERE)

**Step 1 merged. Node visuals stripped.** `task/wires` (revised step
1) and `task/node-visuals-strip` are both on `main` (HEAD `8daf317`).
Trivial Input→ReadGate animates on the wires runtime. The four legacy
`AnimatedNode` visuals — flash, glow, held tint, buffered halo — have
been removed and archived verbatim in
[../sim-substrate/removed-node-visuals.md](../sim-substrate/removed-node-visuals.md)
so they can be restored once the wires runtime publishes equivalent
signals.

What `AnimatedNode` still does after the strip: renders the box,
border, port dots (no halo), `stateText` label, and the offset tween
(visual #5, motion). Nothing else animates on the node itself — only
the edge does, via revised step 1's wire-driven AE.

**This is the entry point for the next session.** The user vetoed the
new corner-glyph design in [../sim-substrate/revised-step-2.md](../sim-substrate/revised-step-2.md);
intent is to **restore the original visuals** (one at a time), driven
by the wires runtime instead of `sim/runner`'s `subscribe()`. The
spec doc still records D2 (a `subscribeNodeTicks` stream) — that part
is still wanted; D1/D3 (corner glyph design) are dropped.

[rt]: /tools/topology-vscode/src/substrate/runtime.ts

## Suggested next commits (small, one visual at a time)

1. Add `subscribeNodeTicks(fn: (nodeId, ts) => void)` to
   [runtime-wires.ts](/tools/topology-vscode/src/substrate/runtime-wires.ts).
   Producer: `node-loop.ts` publishes after each `inputLoop` send and
   each `readGateLoop` ack. Contract test: tick count matches
   send/ack count for the trivial topology.
2. Restore visual #1 (flash) on the wires runtime — copy back from
   the archive, swap the `subscribe(fire)` trigger for
   `subscribeNodeTicks`. Verify visually.
3. Same pattern for #2 (glow), #3 (held tint — needs wire's last
   value), #4 (buffered halo — needs wire `state === "full"` info).
   Each its own commit.

Hold off on the corner glyph; if friction surfaces, revisit.

## Branch / scope

Cut a fresh task branch from `main` (e.g. `task/node-ticks` or
`task/restore-flash`). Trivial Input→ReadGate stays the only topology
through this stretch.

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
