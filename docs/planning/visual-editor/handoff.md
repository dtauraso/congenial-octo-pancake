# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — next task:
     schema-level required-input enforcement (no branch yet).
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — system 3 model: forever-loops, line-level pause, events.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-10, second session of day):

  **Active task branch:** none. `main` is clean. The previous branch
  `task/edge-pulse-motion` merged successfully (pulse arrival gates
  the substrate phase; verified in editor).

  **Last session attempted** `task/readgate-ack-button` — added a
  Button node type + manual ack edge to gate readGate1.chainIn. The
  substrate side worked: with `btn1.out → readGate1.ack` wired,
  `runNode`'s `awaitAll(awaitLoaded)` parked ReadGate until the user
  clicked the button, so chainIn stayed `loaded` and Input
  backpressured upstream. **Branch was torn out** because the gating
  silently regressed the moment a user deleted the Button node + edge
  (the schema declares `ack` as an input but `parseSpec` does not
  enforce it being wired; `runNode` only builds inputs from edges
  actually present). David: "the stupidest and most fragile thing it
  can possibly do." Saved as feedback memory
  `memory/feedback_enforce_required_inputs.md`.

  **Repo state:** `main`, working tree clean. `topology.json` is the
  minimal proof-out: in08 (Input) → readGate1 (ReadGate) on `chainIn`.
  No Button node, no ack edge. With this spec running, pulses cycle
  forever — that's the unresolved friction the next task addresses.

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

  Start `task/readgate-required-ack` (or similar). Add `required?:
  boolean` to the Port type; mark `ReadGate.ack` required in
  `NODE_TYPES`; add a validation pass in `parseSpec` that errors
  on any node missing a required input edge; update `topology.json`
  (or add a gating source) so the spec validates. See
  [handoff-next-task.md](handoff-next-task.md) for the full scope and
  what's explicitly out of scope (do not re-add the Button node as
  part of this task — enforcement first, affordance second).

## Dormant

- Identity body in `run-frames.ts:79-84` — every non-source node
  emits `vals[0]`. Body registry deferred until a node needs real
  semantics.
- Shape D port; tick-batching audit superseded.
- Restart-Input friction (input cycles once and stops).
- Button / manual-ack UX — parked, revisit after enforcement lands.

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
