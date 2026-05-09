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

State at handoff (2026-05-08, end of seventh session):
  Active branch: `task/node-ticks`. `main` still at `392602f`.

  This session landed the **first multi-input ChainInhibitor port**:

  - **`joinLoop` primitive** — ack-only multi-input join, no
    outbound. `await Promise.all(awaitValue)` → `onFire` → `await
    Promise.all(awaitReady)` → loop. The second `awaitReady` is
    load-bearing: it lets the visual layer (PulseInstance.onDone →
    ackWire) pace the cycle. Earlier shapes (synchronous self-ack;
    rAF-yield self-ack) caused canvas-blank and train-of-pulses
    regressions respectively.
  - **`matchSubstrate` widened** to a second shape: Input +
    ChainInhibitor → ReadGate (chainIn + ack edges).
  - **runtime-wires dispatch** + new `runtime-wires-shapes.ts`
    helper. ChainInhibitor with no inbound cycles `[1]` as a clock
    placeholder.
  - Memory: [feedback_substrate_visual_pacer.md](../../../memory/feedback_substrate_visual_pacer.md)
    captures the diagnostic: empty canvas + setTimeouts not firing
    = microtask hot loop in substrate; the visual layer must pace.
  - 250/250 vitest; tsc + build clean.

  Prior-session shipped work (still current on `main`):

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

Start at [handoff-next-task.md](handoff-next-task.md). Substrate
primitives are in place; the next move is the first real **node
port** that uses `andGateLoop` end-to-end (most natural target:
`ChainInhibitorNode` in the substrate runtime, which requires
widening `matchSubstrate` and `runtime-wires` past the trivial
Input→ReadGate shape). Still optional — the broader posture remains
friction-driven; if no editor friction surfaces, drive the substrate
forward.

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
