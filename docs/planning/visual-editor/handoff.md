# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — next task:
     generalize the manual-gate pattern, or pick up a friction item.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — system 3 model: forever-loops, line-level pause, events.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-10, fifth session of day):

  **Active task branch:** `task/wire-slot-contract-audit` (six
  commits ahead of main, all pushed; verified working in editor).
  Awaiting sign-off to merge.

  **What landed (in commit order):**
  1. `9477360` Slot-contract audit tests in
     `test/contracts/wire-slot-contract.test.ts` (6 tests) pinning:
     send-on-non-empty throws, `taken→empty` substrate-only (no
     `arrived` event), only `loaded` animates (headless default
     auto-arrives; rendered defers until `markArrived`).
  2. `c6a50a1` Remove `ReadGate.ack` port and `ackSrc` Input from
     the live topology. Model correction: ack is wire state, not a
     separately-wired input port — the slot lives inside the
     destination node, the wire transports the pulse.
  3. `a7194bd` `Wire.clear()` substrate escape hatch + new
     `cleared` event. Mid-flight clears wait for arrival (preserves
     animation contract); taken→empty and loaded+arrived→empty
     fire immediately.
  4. `daf5d1f` Editor wiring: `clear-slot { nodeId, port }` message,
     `RunFramesHandle.clearWire`, top-left ⌫ button on ReadGate
     nodes (`ClearSlotButton.tsx`).
  5. `b93a90d` Skip the generic node-loop for ReadGate-typed nodes
     in `run-frames.ts` so the slot stays loaded after arrival;
     each click of ⌫ advances one pulse from in0.
  6. (this commit) `topology.view.json` camera state from the
     working session.

  **Gates:** tsc ✓, build ✓, vitest 204/204 ✓ (was 194; +6 audit
  + 5 clear tests), vocab ✓, LOC ✓.

  **Held invariants (unchanged):** MODEL.md (Path A). Phases
  ordinal; one permitted duration is per-wire `loaded` traversal
  time; one permitted renderer→substrate signal is `pulse-arrived`.
  Headless wires default `renderArrival: false`. Halt/resume on
  substrate; send-on-non-empty throws. `Wire.clear()` is the
  editor-only escape hatch and emits `cleared`.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher fired`
to Output → Log (Extension Host).

## Next move

  **Sign-off + merge** `task/wire-slot-contract-audit` to main, then
  pick up the follow-on in [handoff-next-task.md](handoff-next-task.md).

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
