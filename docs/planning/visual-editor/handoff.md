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

State at handoff (2026-05-09, twentieth session):
  Active branch: `task/node-ticks`. Latest commit: `f680b02`
  (uniform-node step 2 — `selfAcksAll` shape-level opt-out).
  Suite green (265/265), tsc + build clean.

  Step 2 added `ShapeSetup.selfAcksAll?: boolean` and plumbed it
  through `runtime-wires.ts`: when a shape sets it, `isSelfAckEdge`
  returns true for every wire in the shape, so the visual layer's
  `usePulseLanesWire.advanceLane0` skips its arc-completion ack
  uniformly. Logically equivalent to enumerating every edge id in
  `selfAckEdges`, but lets step 3+ port a shape onto `nodeLoop` with
  one flag instead of an id list. No call site sets it yet — behavior
  unchanged. The per-edge `selfAckEdges` path remains for shapes (like
  Shape D today) that only self-ack a subset.

  Step 1 (carried): `src/substrate/node-loop-uniform.ts` (89 LOC)
  exports `Descriptor` (`send` | `idle` | `stop`), `NodeSpec`, and
  `nodeLoop(node)`. Loop shape: awaitGate → awaitValue all inbound →
  self-ack each (consume-on-read, uniform) → decide(values) → fan-out
  to outbound in parallel (each does awaitReady then send) → onTick.
  Tests in `test/contracts/node-loop-uniform.test.ts` cover
  input-style, AND-join, fan-out, cycle self-pump, seed-then-stop,
  and pause.

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

**Active task: uniform-node refactor, step 3 of 8.** Plan in
[handoff-uniform-node-plan.md](handoff-uniform-node-plan.md) — read
that next. Step 2 done at `f680b02`.

**Step 3 to do: port Shape A (`setupInputReadGate`) to `nodeLoop`.**
Replace its current `inputLoop` + `readGateLoop` pair with two
`nodeLoop`-driven `NodeSpec`s: an Input node (no inbound; `decide`
closes over a queue, returns `send` until empty then `stop`) and a
ReadGate node (one inbound, no outbound; `decide` returns `idle`,
publishes held/tick via `onTick`). Set `selfAcksAll: true` on the
returned `ShapeSetup` and drop `manualAckEdges` for that wire — the
node-loop self-acks on read, and step 2's flag tells the visual
layer to skip its arc-completion ack. Keep tick/held/buffered
publication identical so existing tests pass. Branch is green at
`f680b02`; step 3 must keep 265/265.

Steps 4–8 (port Shape B → C → D, then delete old variants and
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
