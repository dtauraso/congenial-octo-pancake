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

State at handoff (2026-05-08, end of fifth session):
  Active branch: `task/node-ticks` at `4827ea2` (pushed). `main`
  still at `392602f` — three commits accumulated on this branch
  (two pause-freeze remount fixes + one Wire API extension) and not
  yet merged.

  This session added:

  - **Wire ready/value back-channel API** (`4827ea2`).
    Predictive readiness signals for sender gates and a symmetric
    value-presence signal for receiver loops, so future AND-gate
    and select-style node loops can compose multi-input topologies
    without racing `awaitReady()` against `send()`. New surface on
    `Wire`: `ready` / `onReadyChange` / `awaitReady` (sender side,
    level + edge), `hasValue` / `onValueChange` / `awaitValue`
    (receiver side, same shape). `awaitReady` is level-triggered
    (resolves immediately if idle); `onReadyChange` is edge-triggered
    so AND gates fire once per cycle. `awaitValue` does NOT ack —
    receiver must call `ackWire` explicitly. Emissions are wired
    into existing `send` and `_ack` transitions; no node-loop or
    runtime consumer changes yet, so the new API is inert in the
    running editor. 9 new contract tests in
    `test/contracts/wire-primitive.test.ts`. Architectural invariant
    pinned during design: one sender per Wire — contention happens
    at receiver nodes with multiple inbound wires, not at the wire
    layer, so there is no TOCTOU between `awaitReady` and `send`.

  Prior session on this branch:

  - **Paint one frame on mid-pause remount** (`e5b20d7`).
  - **Pause-freeze on PulseInstance remount** (`a0260fb`).

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

Start at [handoff-next-task.md](handoff-next-task.md). The Wire API
is now ready to thread through `inputLoop` and a new multi-input
node loop (likely `andGateLoop`). That's the first commit where the
`4827ea2` API earns its keep. Still optional — the broader posture
remains friction-driven; if no editor friction surfaces, drive the
substrate forward.

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
