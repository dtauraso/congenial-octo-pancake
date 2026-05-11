# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — next branch
     `task/edge-pulse-motion` (not yet started; prerequisite merged).
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — system 3 model: forever-loops, line-level pause, events.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-10, sixtieth session):
  **Active task branch:** none. `task/wire-phase-state` merged to
  `main` as `c79b9a7` and the branch was deleted (local + remote).

  Last achievement: substrate wire phase widened from
  `empty | carrying(v)` to `empty | loaded(v) | taken(v)` so the
  renderer can distinguish traveling from arrived-but-not-acked.
  Phase matches the wire loop's own await points; substrate stays
  timing-free per MODEL.md. `carrying` is fully retired and added to
  the vocab gate. Frame plumbing emits one frame per phase
  transition (load / take / ack); AnimatedEdge reads the phase.

  **Gates on main:** tsc ✓, build ✓, vitest 38 / 193 ✓, vocab gate ✓.

  **Model:** `handoff-substrate-iteration.md`, with phase amendment
  in MODEL.md applied. Three phases ordinal, not timed.

  **Held:** halt/resume on substrate; send-on-non-empty throws;
  renderer adapter / host-shim / frame-store live outside
  `src/substrate/` for the vocab gate.

  Working tree: `topology.view.json` and `topology.json` — editor
  state and active spec. Minimal proof-out topology is
  in08 (Input) → readGate1 (ReadGate) on `chainIn`.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher
fired` to Output → Log (Extension Host). When `topology.json` is
open in an editor tab, the extension reads from the buffer (not
disk) — revert the tab if you edit the file outside VS Code.

## Next move

  Start `task/edge-pulse-motion` from `main`: renderer-only
  `pulse-clock` module + per-edge rAF hook driven by the new
  loaded / taken / ack phase transitions. Lives under
  `src/webview/rf/`, never imported from `src/substrate/`. See
  [handoff-next-task.md](handoff-next-task.md) for shape and the
  one open question (single global rAF vs per-edge).

Dormant: Shape D port; tick-batching audit superseded; restart-Input
friction (input cycles once and stops — separate task whenever).

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
