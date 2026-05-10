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

State at handoff (2026-05-09, nineteenth session):
  Active branch: `task/node-ticks`. Latest commit: `2776cc0`
  (uniform-node step 1 — `nodeLoop` primitive + contract tests).
  Suite green (265/265, +6 new), tsc + build clean.

  Step 1 added `src/substrate/node-loop-uniform.ts` (89 LOC) with
  `Descriptor` (`send` | `idle` | `stop`), `NodeSpec`, and
  `nodeLoop(node)`. Loop shape: awaitGate → awaitValue all inbound →
  self-ack each (consume-on-read, uniform) → decide(values) → fan-out
  to outbound in parallel (each does awaitReady then send) → onTick.
  No call sites yet. Tests in `test/contracts/node-loop-uniform.test.ts`
  cover input-style, AND-join, fan-out, cycle self-pump,
  seed-then-stop, and pause.

  Carried context from step 0: Shape D self-pumps via `fb56c30`'s i1
  fan-out + one-shot `seedLoop` + per-round `setTimeout(0)` yield in
  `andGateLoopFanOut`. Old loop variants still in tree; retired in
  step 7. Conceptual frame: **concurrent clocks frozen on command**.
  Manual-ack doc: [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md).

  Working tree: `.claude/settings.json` and `topology.view.json` carry
  incidental drift — leave or stash. Reference branches retained:
  `task/runtime-substrate-rebuild`, `task/wires`,
  `task/node-visuals-strip`. Do not delete.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher
fired` to Output → Log (Extension Host).

## Next move

**Active task: uniform-node refactor, step 2 of 8.** Plan in
[handoff-uniform-node-plan.md](handoff-uniform-node-plan.md) — read
that next. Step 1 done at `2776cc0`.

**Step 2 to do: visual auto-acker opt-out.** Add a flag (per-shape
in `ShapeSetup` or per-wire) the visual layer reads to skip its
arc-completion ack. Today the visual layer skips manual-ack edges;
extend the same opt-out to "self-acks-everything" shapes (which is
what step 3+ wiring will produce). No behavior change yet — Shapes
A–D still run on the old loop variants; this just unblocks step 3
to wire one shape onto `nodeLoop` without the visual layer
double-acking. Branch is green at `2776cc0`; step 2 must not change
that.

Steps 3–8 (port Shape A → B → C → D, then delete old variants and
manual-ack plumbing, then re-render handoff) are in the plan doc.
One step per session; do not bundle.

Before touching anything, also read
[../../manual-ack-mechanism.md](../../manual-ack-mechanism.md) — it
describes the load-bearing assumption being undone in step 7.

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
