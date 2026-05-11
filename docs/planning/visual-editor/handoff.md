# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — open friction:
     port `<Node>` bodies for the remaining node types when each
     surfaces in a session.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — substrate model background (forever-loops). Realized by the
     React-component substrate now on `main`.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-11, end of session):

  **Active branch:** `task/edge-visual-fidelity`. Edge visual
  fidelity is ported onto `RSubstrateEdge`: kind colors via
  `KIND_COLORS`, dashes via `dashForKind`, arrow markers via
  `markerEndUrl`, route variants (line/snake/below) via the new
  `edge-path.ts`, edge labels via the new `EdgeLabels.tsx`. `Wire`
  now accepts optional `arcLength` (self-measures with
  `getTotalLength()` when omitted), plus `strokeDasharray` and
  `markerEnd` props. Branch is unmerged; reviewable.

  **Gates:** tsc ✓, build ✓, vitest 114/114 ✓, vocab skipped (no
  substrate/ dir), LOC ✓.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place.

## Next move

  Merge `task/edge-visual-fidelity` into `main` (sign-off required
  per CLAUDE.md workflow). After merge, posture returns to
  friction-driven; the remaining owed work is porting `<Node>`
  bodies for ChainInhibitor, AndGate, Partition, EdgeNode, etc.,
  one type at a time as it surfaces in a real session. See
  [handoff-next-task.md](handoff-next-task.md).

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
