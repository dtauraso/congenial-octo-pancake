# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — **start here**
     for the next commit. Spec has been re-framed: wire-as-entity,
     not inbox-deferral. Read carefully — this reverses the prior
     cheap-fix framing.
  2. [handoff-step1-notes.md](handoff-step1-notes.md) — what was
     built on the rebuild branch (decision audit, coupling hacks
     gated to step 1, automated logging, e2e).
  3. [handoff-gate-a.md](handoff-gate-a.md) — earlier merge to main
     (Gate A).
  4. [handoff-rebuild-plan.md](handoff-rebuild-plan.md) — port plan,
     contracts R1–R5, auto-retire signal.
  5. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-10, fiftieth session):
  Active branch: `task/node-ticks`. Steps 1–6 + 7a + 7b landed
  previously. **Step 7c — webview painter** landed this
  session (commit `168645e`). New:
  `webview/frame-store.ts` (useSyncExternalStore bridge;
  `active` flips true on first FrameMsg). `main.tsx` routes
  `frame` msgs into the store. `AnimatedEdge.tsx` and
  `AnimatedNode/AnimatedNode.tsx` subscribe; while
  frame-mode is active they paint per-wire empty/carrying
  (tinted stroke + value chip mid-edge) and per-node
  four-state (fill+border) on the SAME canvas — legacy
  pulse rendering is suppressed by `!frameMode &&` guards.
  Flag-off path is byte-identical. Build/tsc/vocab/LOC
  clean; 309 pass, same two pre-existing reds.

  **Decision locked this session:** painter REPLACES the
  legacy renderer on the same canvas while
  `topology.frameRendererEnabled` is on. Not an overlay.

  **Not yet proof-out:** painter has not been driven through
  VS Code on a real topology. Code is complete; visual
  verification is the next move before flipping the default.

  **Model:** see `handoff-substrate-iteration.md`. Forever-loops per
  node and per wire; backpressure coordination; line-level pause;
  ordinal-seq state-change events; renderer owns pacing. Substrate
  is **timing-free** per MODEL.md. Runtime.ts port unblocked.

  **Held:** halt/resume on substrate; legacy is a working museum
  (`LEGACY_SKIP`); send-on-non-empty throws; renderer adapter stays
  outside `src/substrate/`.

  Pre-existing reds: `shape-d-cycle.test.ts`,
  `handle-load-repro.test.ts`. Manual-ack:
  [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md).
  Working tree: `topology.{json,view.json}` — editor state.
  Reference branches retained — do not delete.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher
fired` to Output → Log (Extension Host).

## Next move

Read [MODEL.md](../../../MODEL.md) and
[handoff-substrate-iteration.md](handoff-substrate-iteration.md).
Step 7c (webview painter) landed. Next move: **proof-out**.
Open the topology tab on a real spec, flip
`topology.frameRendererEnabled` on, verify per-wire
empty→dim / carrying→tinted+chip transitions and per-node
four-state fill+border updates; confirm no legacy pulses bleed
through. If proof-out passes, evaluate flipping the flag
default. If friction surfaces (chip / `EdgeLabels` overlap,
four-state legibility, identity-broadcast too thin for visual
coverage), log to session-log.md and either fix forward or tee
up 7d (richer node kinds). See
[handoff-next-task.md](handoff-next-task.md).

Dormant: triage pre-existing reds (`shape-d-cycle`,
`handle-load-repro`); Shape D port. Tick-batching audit superseded.

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
