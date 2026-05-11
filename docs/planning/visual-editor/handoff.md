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

State at handoff (2026-05-10, sixty-first session):
  **Active task branch:** `task/edge-pulse-motion` (pushed, awaiting
  in-editor verification before merge to `main`). Last commit
  `c33d204`.

  Last achievement: AnimatedEdge now spawns a `PulseInstance` on the
  `empty → loaded` phase transition, reading the value from the
  frame store. The static held-value badge renders only on `taken`
  (after the pulse finishes / unmounts), and clears on `taken →
  empty` ack — matching the loaded/taken/ack ordinal. Legacy
  event-driven trigger removed: `_use-pulse-lanes-ticked.ts` deleted
  and `subscribe/publishEdgeArrive` stripped from
  `substrate/node-streams.ts`. Per-edge rAF stays on each
  `PulseInstance` (seamless geometry).

  **Gates on branch:** tsc ✓, build ✓, vitest 38 / 193 ✓, vocab
  gate ✓, LOC ✓ (AnimatedEdge.tsx = 95).

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

  Drive the editor and verify pulse motion: load the proof-out
  topology (in08 → readGate1), trigger input, observe that the
  pulse animates along the edge during `loaded` and that the static
  badge replaces it on `taken` then clears on ack. If the visuals
  match the model, merge `task/edge-pulse-motion` to `main`,
  delete the branch (local + remote), and pick the next friction
  item from [session-log.md](session-log.md). If they don't, log
  the friction and iterate on this branch.

  Pulse speed default lives at
  `_constants.ts:PULSE_SPEED_PX_PER_MS` (0.3 px/ms = 300 px/s);
  tune from session-log feedback if needed.

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
