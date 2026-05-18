# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-18, Input default + delete crash fix)

**Active branch:** `task/editor-friction-pass-4`, two commits ahead of
`main` (rebuilt from main after both commits accidentally landed
directly on main mid-session; main was reset to `1c6eb12`). Working
tree has unstaged edits in `topology.json` / `topology.view.json`
(user's in-editor state, includes a working `input0` + `readGate0`
pair plus the original ring). Nothing pushed.

## What landed on this branch

- `8a0d8a0` **fix(visual-editor):** seed Input nodes with
  `data.init: [0, 1]` on palette drop. Previously a freshly-dropped
  Input had no `data.init`, so `InputBody`'s queue was empty and it
  silently no-op'd every RAF tick. Default applied in
  `rf/app/_use-drag-drop.ts` only; existing Input nodes saved before
  the fix are unaffected (re-drop to pick up the default).
- `e3a9131` **fix(visual-editor):** stop capturing the immer draft in
  the delete handler. `_handle-delete.ts:17` captured the draft `s`
  into `ctx.lastSpec.current`; after `produce()` returned, immer
  revoked the proxy and the subsequent `rebuildFlow → specToFlow`
  deref threw `Cannot perform 'get' on a proxy that has been revoked`.
  The render-phase throw hit the `ErrorBoundary` and unmounted most
  of the editor — symptom user reported was "the entire diagram and
  most of the editor vanished" on Input delete. Fix: drop the capture;
  re-read via `getSpec()` after `mutateBoth` returns.

## Next action

None queued. Drive the editor and let friction pick the next task.
Two open friction signals worth watching:

- **Inert nodes by construction.** Same bug-class as the Input/init
  case: an editor-created node can land in a state where its body
  silently no-ops. A `ReadGate` with no outgoing `out` edge bails on
  `!wire` and never consumes its inputs — no visual signal that it's
  dead. Candidate fix shape per `feedback_enforce_required_inputs`:
  model-enforced required output, or a visual "inert" indicator.
- **Process hygiene.** Two commits landed directly on `main` this
  session before the user noticed. The merge of
  `task/editor-friction-pass-3` left HEAD on main, and subsequent
  fixes were committed there rather than on a new task branch.
  Mitigation: start each new piece of work by checking out a fresh
  `task/...` branch, not by committing on whichever branch HEAD
  happens to be.

## Parked (not open; revisit when friction returns)

- **Fan-out back-pressure on ChainInhibitor** still unsolved. Naive
  `wire.canAccept && inhibitWire.canAccept` gate broke animation both
  times it was tried. Trace deadlock if retried.
- **Pacing-by-pixel-length / wire-length-dependent firing** — item 9
  in [recommendations.md](recommendations.md). Audit (2026-05-17)
  found no active firing-rule divergence: all node predicates are
  slot-phase-only. Two artifacts noted: dead file `fanout-convergence.ts`
  reads `wire.phase` (prohibited pattern, but unused); ChainInhibitor's
  two-load pattern can lose the inhibitOut token if that wire is
  in-flight, masked today by wire lengths making both wires accept on
  the same frame. Do NOT reach for a clock primitive, barrier, or
  sequence-tagged values; MODEL.md has no logical-tick view.

## What's actually working

- End-to-end ring animation with real input values flowing through.
- ReadGate pass-through emits `slots[0]`'s consumed value.
- Edge seed delivers once to dest slot at wire mount.
- Drag-to-move ports: 12 snap positions, swap on collision, edges
  follow via `updateNodeInternals`.
- Newly-dropped Input nodes come with `data.init: [0, 1]` and emit
  immediately on play.
- Deleting a node no longer crashes the editor.
- `tsc --noEmit` clean; `npm run build` clean.
- 4 Playwright scenario tests all pass (`npm run test:e2e`).
- `check-substrate-vocab.mjs` clean.

## Substrate model state

MODEL.md (as of 2026-05-17 / `485f041`) has no global round, tick, or
simultaneity layer. Coordination is local via slot phases. Any
reasoning that reaches for a clock primitive, barrier, sequence-tagged
values, or "logical view" is drift — the substrate has one view.
Banned vocabulary includes tick/round/step/cohort/lap; the vocab check
script enforces this in substrate-r/.

## Dev-loop

After any substrate-r edit: `npm run build` (tsc alone doesn't refresh
`out/webview.js`). Live log at `.probe/webview-log.jsonl`; clear with
`: > .probe/webview-log.jsonl` between runs (NOT before reading the
current run). The log is currently >500 MB — worth clearing when
convenient.

Cwd for tsc/tests/check-loc/build: `tools/topology-vscode/`.

## ALWAYS clause

At end of session, overwrite this file with a freshly-rendered
prompt tailored to the state you're leaving the branch in, and
commit on the active branch (main if no task is in flight). Do not
rely on chat history; the next AI may be a fresh model with no
transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes.
