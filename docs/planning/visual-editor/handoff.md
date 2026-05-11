# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — next task:
     wire-primitive slot-contract audit (no branch yet).
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — system 3 model: forever-loops, line-level pause, events.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-10, fourth session of day):

  **Active task branch:** `task/readgate-required-ack` (this session,
  two commits, not yet merged). Awaiting sign-off to merge to main.

  **What landed:**
  - `Port` type gained `required?: boolean`. `ReadGate.ack` is now
    `required: true` in `NODE_TYPES`.
  - `validatePorts` (in `parse-meta.ts`) now errors when any node has a
    declared `required` input with no incoming edge. Error names the
    node id, node type, and port — e.g. `node readGate1 (ReadGate):
    required input "ack" has no incoming edge`. Parse failure routes
    through `frame-renderer.ts` unchanged.
  - New test in `test/parseSpec.test.ts` covers the parse-error path.
  - `topology.json` gained an `ackSrc` Input feeding `readGate1.ack`
    so the live spec validates. `topology.view.json` lost the stale
    `btn1` entry left over from the abandoned button branch and gained
    an `ackSrc` view entry.

  **Gates:** tsc ✓, build ✓, vitest 194/194 ✓, vocab ✓, LOC ✓
  (`npm run check:loc` clean).

  **Repo state:** task branch with two commits ahead of main. Working
  tree has `topology.view.json` ackSrc/btn1 swap not yet committed —
  fold it into the merge or commit on the branch before signing off.

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

  **Sign-off + merge** `task/readgate-required-ack` to main (per the
  workflow rule: merging to main requires explicit sign-off). Then
  pick up the follow-on:

  Wire-primitive slot-contract audit against MODEL.md: send-on-non-
  empty throws; `taken → empty` is substrate-only (no renderer
  round-trip); only `loaded` animates (headless wires default
  `renderArrival: false`). Add substrate-level tests covering all
  three. See [handoff-next-task.md](handoff-next-task.md) for the
  framing.

  Affordance question parked: `ackSrc` is a placeholder Input, not a
  decided UX. Once the slot-contract audit lands, revisit whether the
  gating source should be a Button (manual), Input (seeded), or
  something else.

## Dormant

- Identity body in `run-frames.ts:79-84` — every non-source node
  emits `vals[0]`. Body registry deferred until a node needs real
  semantics.
- Shape D port; tick-batching audit superseded.
- Restart-Input friction (input cycles once and stops).
- Button / manual-ack UX — parked until the slot-contract audit
  decides what the gating source should look like.

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
