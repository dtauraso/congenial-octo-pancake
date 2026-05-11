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

State at handoff (2026-05-10, sixty-second session):
  **Active task branch:** `task/edge-pulse-motion` (commit pending at
  handoff; awaiting in-editor verification before merge to `main`).

  Last achievement: **MODEL.md amended to Path A** — geometry now sets
  the `loaded` phase's traversal time, and the substrate waits for
  pulse arrival before `loaded → taken`. Substrate gained
  `arrived` event + `markArrived`/`awaitArrived` on wires;
  `node-loop-uniform-v2` awaits arrival before `take()`; webview
  posts a new `pulse-arrived` message on `PulseInstance.onDone`,
  routed through `handle-message → frameRenderer.markArrived →
  runFrames.markArrived → wire.markArrived`. Pulse speed lowered to
  0.08 px/ms. The previous `phase === "empty" → setPulse(null)` clear
  was removed; preemption is now structurally impossible because the
  substrate cannot re-enter `loaded` until the prior pulse arrived.

  **Gates on branch:** tsc ✓, build ✓, vitest 38 / 193 ✓, vocab
  gate ✓, LOC ✓.

  **Model:** MODEL.md (amended). Phases stay ordinal; the one
  permitted duration is per-wire `loaded` traversal time
  (`arcLength / pulseSpeed`); the one permitted renderer→substrate
  signal is pulse arrival. Headless wires (default
  `renderArrival: false`) auto-mark arrival on `load` so existing
  tests are unchanged.

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

  Commit the in-flight changes on `task/edge-pulse-motion`, then
  drive the editor and verify: every pulse traverses its full edge;
  lengthening an edge mid-flight extends the loaded phase; firing
  inputs rapidly no longer cuts pulses off at ~3/4. If the visuals
  match, merge to `main`, delete the branch (local + remote), and
  pick the next friction item from [session-log.md](session-log.md).
  If they don't, log the friction and iterate.

  Pulse speed default lives at
  `_constants.ts:PULSE_SPEED_PX_PER_MS` (0.08 px/ms). Tune from
  session-log feedback if needed.

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
