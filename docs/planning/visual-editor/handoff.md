# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-step1-notes.md](handoff-step1-notes.md) — what was
     built on the rebuild branch (decision audit, coupling hacks
     gated to step 1, automated logging, e2e).
  2. [handoff-gate-a.md](handoff-gate-a.md) — earlier merge to main
     (Gate A).
  3. [handoff-next-task.md](handoff-next-task.md) — **start here**
     for the next commit.
  4. [handoff-rebuild-plan.md](handoff-rebuild-plan.md) — port plan,
     contracts R1–R5, auto-retire signal.
  5. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-08, end of tenth session):
  Active branch: `task/node-ticks` (merged to `main` at `2957316`
  via `--no-ff`; branch retained for further work).

  This session **backfilled contract tests for back-channel-era
  fixes** (commit `2f48ea9`):

  - `test/contracts/input-loop-await-ready.test.ts` — pins
    inputLoop's send-gating on `out.awaitReady` (commit d01973e),
    the `awaitGate` hook used by pause/resume, and clean stop while
    parked at awaitReady.
  - `test/contracts/runtime-wires-manual-ack.test.ts` — pins
    shape A/B `manualAckEdges` registration and that
    `clearManualAckSlot` advances the joinLoop cycle when auto-ack
    is suppressed (commits f2bffc6 + f9d929e).
  - 258/258 vitest (was 251).

  Prior session (`7d2ae39` and earlier on this branch)
  **generalized manual-ack to multiple edges** and added the
  i1→readGate.ack button + a "clear both" button:

  - `ShapeSetup.manualAckEdges: { id, label }[]` (was singular
    `manualAckEdgeId`). Inhibitor shape registers both chainIn and
    ack. Single-input shape registers in0→readGate.
  - `runtime-wires.ts` exposes `getManualAckEdges()`,
    `isManualAckEdge(id)`, `clearManualAckSlot(edgeId)`. Stop/start
    clear+rebuild a list + Set in lockstep.
  - `usePulseLanesWire` auto-ack skip uses `isManualAckEdge(w.id)`.
  - `ClearSlotButton` renders one `OneClearButton` per registered
    edge plus a `ClearAllButton` when ≥2 (clicks every id in one
    tick → both upstream loops resume simultaneously).
  - **Mechanism doc:** [docs/manual-ack-mechanism.md](../../manual-ack-mechanism.md)
    — full chain, safe-cases, fragile-cases, load-bearing
    assumption ("visual layer is the only auto-acker"). Read it
    before touching any of the four files.
  - 251/251 vitest at the time; tsc + build clean.

  Prior-session work (still current on this branch):

  - `joinLoop` primitive (ack-only multi-input join, paced by the
    visual layer's `onDone → ackWire`).
  - `matchSubstrate` shape B: Input + ChainInhibitor → ReadGate.
  - `runtime-wires` dispatch + `runtime-wires-shapes.ts` helper;
    ChainInhibitor with no inbound cycles `[1]` as a placeholder.
  - Per-edge slot-pacing thread parked
    (see [handoff-slot-plan.md](handoff-slot-plan.md)).
  - Memory: [feedback_substrate_visual_pacer.md](../../../memory/feedback_substrate_visual_pacer.md).

  On `main` (untouched this branch):

  - **Visuals 1–4 on wires runtime** (`6554e07`…`8f13034`): flash,
    glow ring, held tint, buffered halo via
    `subscribeNodeTicks/Held/Buffered`.
  - **Pause = freeze mid-arc** (`34b8c20`): `subscribeWiresPause`
    fans one pause/resume signal; each `PulseInstance` owns its
    rAF clock and freezes/rebases independently.

  Conceptual frame: **concurrent clocks frozen on command**.
  Tests green at 246/246 vitest; tsc + build clean.

  Working tree: `.claude/settings.json` and `topology.view.json`
  carry incidental drift; orthogonal — leave or stash.

  Prior branches preserved as reference:
  `task/runtime-substrate-rebuild`, `task/wires`,
  `task/node-visuals-strip`. Do not delete.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher
fired` to Output → Log (Extension Host).

## Next move

Start at [handoff-next-task.md](handoff-next-task.md). Manual-ack
now covers both readGate slots (in0→readGate and i1→readGate, plus
"both"). The next move is still **giving ChainInhibitor a real
inbound** so it stops being a clock-style placeholder. Friction-driven
posture stands. Before touching the manual-ack code, read
[../../manual-ack-mechanism.md](../../manual-ack-mechanism.md).

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
