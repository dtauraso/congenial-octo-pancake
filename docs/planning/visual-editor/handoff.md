# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — load-bearing
     next task: port edge visual fidelity onto `RSubstrateEdge`.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — substrate model background (forever-loops). Realized by the
     React-component substrate now on `main`.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-11, end of session):

  **Active branch:** `main`. `task/collapse-to-one-layer` was
  merged in this session. The substrate rewrite, deletion sweep,
  and spec promotion all landed. Posture returns to friction-driven
  per CLAUDE.md.

  This session's closing acts:

  1. Folded `manual-take-model.md` and `react-surface-spec.md` into
     [MODEL.md](../../../MODEL.md); deleted the two planning docs.
     MODEL.md now contains the manual-take signal generalization,
     the auto/manually-gated destination policy, and the React
     surface realization (`<Wire>`, `<Node>`, `useTickDriver`,
     geometry-change handling, bridge surface).
  2. Merged `task/collapse-to-one-layer` into `main`. Edge visual
     fidelity is no longer a merge blocker — tracked as the next
     task (see handoff-next-task.md). Editor currently ships with
     plain gray edges.

  **Gates at merge:** tsc ✓, build ✓, vitest 114/114 ✓, vocab ✓,
  LOC ✓.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place.

## Next move

  Read [handoff-next-task.md](handoff-next-task.md). Open a fresh
  `task/<short-kebab>` branch and port edge visual fidelity onto
  `RSubstrateEdge` (kind colors, dashes, route variants, arrow
  markers, edge labels) from git history at `87822c1^`.

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
