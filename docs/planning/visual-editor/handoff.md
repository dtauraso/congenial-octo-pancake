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

State at handoff (2026-05-10, fortieth session):
  Active branch: `task/node-ticks`. HEAD = `1c7e385`.
  `src/substrate/wire-entity.ts` landed (52 LOC); all 5 contract
  tests green; substrate vocab lint clean. No callers wired up.
  Runtime.ts port is **blocked** on the substrate iteration model.

  **Locked this session** (detail in `handoff-substrate-iteration.md`):
  1. Each node runs **once per tick**. Rules out multi-pass.
  2. Topo-order, multi-pass, two-tick latency all rejected as
     loop-tweaks anchored on the wrong invariant.
  3. Wire-level fan-in is not user-authorable; `carry()`-throws is
     code-side defense.
  4. Renderer must batch per-tick to keep substrate sequentialization
     invisible. Latent today. See `handoff-tick-batching-audit.md`.

  **Working direction (not finalized):** nested loop
  substrate→node→edges; node not done until its outgoing edges
  finish delivering. Open shape questions in
  `handoff-substrate-iteration.md` — do not pre-answer.

  **Held:** halt/resume on substrate; legacy is a working museum
  (`LEGACY_SKIP`); send-on-non-empty throws.

  Memory entries:
  `feedback_derive_model_from_visual_spec.md` (cheap-fix detector,
  prior session). A vocabulary-drift sibling is a candidate add-on
  but not yet written.

  Pre-existing red tests, still red, still not blocking:
  `shape-d-cycle.test.ts` (ackEdge race), `handle-load-repro.test.ts`.

  Carried context: Shape D self-pumps via `fb56c30`'s i1 fan-out +
  one-shot `seedLoop` + per-round `setTimeout(0)`. Manual-ack:
  [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md).

  Working tree: `topology.json` (`"runtime": "ticked"` flag for
  verification) and `topology.view.json` (camera drift) — editor
  state, intentionally not committed. Reference branches retained:
  `task/runtime-substrate-rebuild`, `task/wires`,
  `task/node-visuals-strip`. Do not delete.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher
fired` to Output → Log (Extension Host).

## Next move

**Read [MODEL.md](../../../MODEL.md) and
[handoff-substrate-iteration.md](handoff-substrate-iteration.md)
first.** The runtime.ts port is blocked on the substrate iteration
model. Do not propose multi-step plans with options — state the
next single concrete step on the iteration model and wait for
David's sign-off. Wire-entity stays as a green leaf module until
the round mechanic is settled.

Dormant options:
  - Triage pre-existing red tests (`shape-d-cycle`, `handle-load-repro`).
  - Shape D port under manual-ack.
  - Uniform-node, timeout-removal.
  - Tick-batching audit (renderer): see
    [handoff-tick-batching-audit.md](handoff-tick-batching-audit.md).
    Trigger: tick renders as cascade instead of parallel pulse.

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
