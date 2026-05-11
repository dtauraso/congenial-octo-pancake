# Next task: diagnose manual-take multi-click bug, then port `<Node>` bodies

**Branch:** `main`, friction-driven. Open a fresh `task/<short-kebab>`
once the bug is reproducible enough to fix.

## State at handoff (2026-05-11, mid-session)

Commit `3d6e719` (on `main`) adds a value label next to the pulse
circle, slows pulse to 0.08 px/ms, and makes the clear-slot button
white in both states. While testing, user reported the clear-slot
button sometimes needs multiple clicks before the next input value
appears.

## Open: clear-slot multi-click bug

Expected behavior: click while wire is `loaded` →
`wire.take()` → `InputBody` listener acks → empty → tick driver
schedules microtask `advance()` → `InputBody.run()` loads next
value → `loaded` again. One click, one item.

Suspects:

1. **Listener reentrancy in
   [Wire.tsx:51-56](../../../tools/topology-vscode/src/webview/substrate-r/Wire.tsx#L51-L56).**
   `apply()` iterates `phaseListenersRef` and passes a closured
   `next`. If `InputBody`'s listener calls `handle.ack()` mid-
   iteration, the recursive `apply` iterates listeners again with
   `next="empty"`. Later listeners in the outer iteration then
   receive the original closured `next="taken"`, overwriting
   `ManualTakeButton`'s `phaseKind` back to `"taken"` after
   recursion already set it to `"empty"`. Depending on Set
   insertion order this could leave the button reading a stale
   phase.
2. **Microtask vs React render.** `queueMicrotask(advance)` in
   `useTickDriver` fires after the click handler. There may be a
   render frame where the button is disabled before the next
   `load()` re-arms it. Rapid clicks could land on the disabled
   instance.

## Diagnostic asks for the user

  - Does the pulse visibly start moving on a "failed" click (slow
    pulse could mask advance)?
  - Does the value label change between failing clicks?
  - Is the button visually enabled when failing clicks land?

## Owed (after the bug closes)

**Other node types' substrate behavior.** Today only Input and
ReadGate have `node-kinds.tsx` entries. ChainInhibitor, AndGate,
Partition, EdgeNode, etc. mount with no `<Node>` body — fine for
the user's current working topology but anything that uses them
will be inert. Friction-driven posture: port each type only when
it surfaces in a real session.

## ALWAYS clause

(See handoff.md — same clause applies.)
