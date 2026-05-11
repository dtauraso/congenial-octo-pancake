# Next task: port `<Node>` bodies for remaining node types

**Branch:** `main`, friction-driven. Open a fresh `task/<short-kebab>`
once a specific node-kind body is in someone's way.

## State at handoff (2026-05-11, mid-session)

Commit `3d6e719` (on `main`) adds a value label next to the pulse
circle, slows pulse to 0.08 px/ms, and makes the clear-slot button
white in both states.

The clear-slot multi-click bug previously suspected here is closed
— on re-test the button advanced on a single click. No code change
was needed. Reopen this section if it resurfaces.

Latent risk worth keeping in mind: listener reentrancy in
[Wire.tsx:51-56](../../../tools/topology-vscode/src/webview/substrate-r/Wire.tsx#L51-L56).
`apply()` iterates `phaseListenersRef` and passes a closured
`next`. A listener that calls `handle.ack()` mid-iteration causes
a recursive `apply`; later listeners in the outer iteration then
receive the original closured `next`, which can overwrite phase
state set by the recursion. Not currently observed in practice,
but if odd ordering bugs surface, look here first.

## Owed work

**Other node types' substrate behavior.** Today only Input and
ReadGate have `node-kinds.tsx` entries. ChainInhibitor, AndGate,
Partition, EdgeNode, etc. mount with no `<Node>` body — fine for
the user's current working topology but anything that uses them
will be inert. Friction-driven posture: port each type only when
it surfaces in a real session.

## ALWAYS clause

(See handoff.md — same clause applies.)
