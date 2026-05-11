# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — next task:
     affordance question for `readGate1.ack` (Button vs Input vs
     feedback). Slot-contract audit just landed.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — system 3 model: forever-loops, line-level pause, events.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-10, fifth session of day):

  **Active task branch:** `task/wire-slot-contract-audit` (this
  session, one commit, not yet pushed). Awaiting sign-off to merge to
  main.

  **What landed:**
  - `test/contracts/wire-slot-contract.test.ts` (6 tests) pins the
    three slot-contract rules from MODEL.md (Path A) at the substrate
    level:
    1. `load()` on a loaded **or** taken wire throws.
    2. `ack()` (the `taken → empty` transition) emits only the
       substrate `acked` event — no renderer-facing `arrived`.
    3. Only `loaded` traversal animates: headless wires
       (`renderArrival: false`, default) auto-mark arrival on load;
       rendered wires (`renderArrival: true`) defer `arrived` until
       `markArrived()` is called externally. `taken` and `empty`
       transitions never emit `arrived`.
  - All three rules were already honored by `wire-entity.ts`; the
    commit makes the contract mechanical, not conventional.

  **Predecessor merge:** `task/readgate-required-ack` merged to main
  earlier this session (merge commit 206d791, pushed). That branch
  added `Port.required`, marked `ReadGate.ack` required, wired
  `ackSrc` Input → `readGate1.ack` in the live topology.

  **Gates:** tsc ✓, build ✓, vitest 200/200 ✓ (was 194; +6 new),
  vocab ✓, LOC ✓.

  **Repo state:** task branch with one commit ahead of main. Working
  tree has `topology.view.json` drift (camera/selection + an
  `ackSrc`→`btn1` regression of the merged fix); the same drift was
  carried through the previous merge via `git stash`. Do not fold
  this into the merge — discard or stash again before signing off.

  **Held invariants (unchanged):** MODEL.md (Path A). Phases ordinal;
  one permitted duration is per-wire `loaded` traversal time; one
  permitted renderer→substrate signal is `pulse-arrived`. Headless
  wires default `renderArrival: false`. Halt/resume on substrate;
  send-on-non-empty throws.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher fired`
to Output → Log (Extension Host). When `topology.json` is open in an
editor tab, the extension reads from the buffer (not disk) — revert
the tab if you edit the file outside VS Code.

## Next move

  **Sign-off + merge** `task/wire-slot-contract-audit` to main (per
  the workflow rule: merging to main requires explicit sign-off).
  Then pick up the follow-on:

  Affordance question for `readGate1.ack`: `ackSrc` is a placeholder
  Input, not a decided UX. Decide whether the gating source should be
  a Button (manual ack), a seeded Input (current placeholder), or a
  feedback loop from a downstream node. See
  [handoff-next-task.md](handoff-next-task.md).

## Dormant

- Identity body in `run-frames.ts:79-84` — every non-source node
  emits `vals[0]`. Body registry deferred until a node needs real
  semantics.
- Shape D port; tick-batching audit superseded.
- Restart-Input friction (input cycles once and stops).
- Button node type — revisit as part of the affordance question.

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the active branch
(main if no task is in flight). Do not rely on chat history; the
next AI may be a fresh model with no transcript. The rendered
handoff must itself contain this same ALWAYS clause so the loop is
self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
