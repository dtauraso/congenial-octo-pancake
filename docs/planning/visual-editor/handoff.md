# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

---

Continuing on wirefold, branch `task/runtime-substrate-rebuild` (off
`main`, tip `fbaaa2a`). Gate A passed; this is the rebuild branch.
Next work is **port-plan step 1**: stand up the chan→wire renderer
against a trivial two-node topology.

State at handoff:
  Local on `task/runtime-substrate-rebuild`, no remote yet (push on
  first commit).
  Working tree has `topology.view.json` modified (incidental editor
  pan/zoom from prior session; not part of rebuild work — leave it or
  discard, do not commit as a rebuild change).
  Tests/build untouched this session — last verified 230/230 +
  tsc/check:loc/build clean at 5a8948a.

## What just landed (Gate A pass)

`task/sim-substrate-sketches` merged to `main` at fbaaa2a and was
deleted (local + remote). The merge brought:
  - chan sketches (anim + wire) at
    [../sim-substrate/chan-anim.html](../sim-substrate/chan-anim.html)
    and [../sim-substrate/chan-wire.html](../sim-substrate/chan-wire.html).
  - Tabbed [index.html](../sim-substrate/index.html).
  - Pre-rebuild topology archived at
    [../sim-substrate/topology-pre-rebuild.json](../sim-substrate/topology-pre-rebuild.json)
    and [.view.json](../sim-substrate/topology-pre-rebuild.view.json).
  - Repo-root `topology.json` + `topology.view.json` swapped to a
    2-node `in08 → readGate1` pair (does not animate; intentional).
  - C6–C8 in [contracts.md](contracts.md) marked **OBSOLETE**.
  - [rebuild-plan.md](../sim-substrate/rebuild-plan.md) — the spec
    for this branch.

Gate A revisions made before merge: corrected lowest-index
attribution (came from the dropped select sketch, not chan); flagged
per-node running indicator as prose-only spec until port step 2;
clarified R5 does not forbid sub-frame tweening; deferred
buffered-vs-unbuffered decision to port step 1.

## Next task — START HERE

**Port-plan step 1: stand up the chan→wire renderer against a
trivial two-node topology.** Spec lives in
[../sim-substrate/rebuild-plan.md](../sim-substrate/rebuild-plan.md)
§"Port plan". Visible-state spec is the chan sketches.

In this commit, pick and document the buffered-vs-unbuffered choice
(deferred at Gate A). Smallest viable two-node topology — likely
unbuffered (cap=0) since that's "receiver waiting right now," which
matches the existing in08→readGate1 shape.

Do **not** start step 2 (per-node running indicator) or step 3
(R1–R5 contract tests) in the same commit. One step per commit per
the plan doc.

Budget for step 1: ~$5–$10. Model: sonnet for the mechanical edits
once direction is clear; opus for the design call on cap=0 vs cap=1
and where the renderer lives in the tree.

## Rebuild plan summary (carried forward)

Visual primitives:
  1. **chan → wire.** Spec'd by chan sketches.
  2. **Per-node running indicator (with reloop).** Prose spec only;
     drawn for the first time in port step 2.

Semantic contracts (Go-side tests under `internal/substrate/contracts/`
or equivalent):
  - **R1** Channel FIFO.
  - **R2** Select determinism = lowest-index.
  - **R3** Scheduler determinism (byte-identical state given same
    inputs).
  - **R4** No goroutine runs twice per step.
  - **R5** Animation step = state transition (sub-frame tweening of
    in-flight position OK; endpoints are the transitions).

Port plan steps:
  1. Chan→wire renderer + trivial two-node topology. ← **next**
  2. Per-node running indicator + reloop glyph.
  3. R1–R5 contract tests (red until substrate satisfies them).
  4. Pilot port: one inhibitor (smallest equivalent).
  5. Bulk port: input sources → latches → inhibitors → detectors →
     gates → partitions.
  6. Delete probe machinery (`.probe/stuck-pulse-last.json` family,
     `.probe/runner-errors-last.json`, `RunnerProbe` toolbar latches,
     `window.__resetPulseLeak`).

## Auto-retire signal for `task/in0-readgate-emission-ack`

Pre-authorised by rebuild-plan.md: delete the parked branch (local
+ remote) on the **first green rebuild contract test** (any of
R1–R5). No re-ask required.

## Conceptual frame (carried forward)

  - **Logic state IS visible state.** No render/logic split. Every
    primitive is specified as visible-state-transition rules; data
    shape is derived from the visual, not the other way around. See
    [memory/feedback_visual_first_default.md](../../../memory/feedback_visual_first_default.md).
  - **The industry's projection bias.** Static abstractions get
    privileged because they're tractable for symbolic reasoners.
    They're lossy compressions of the actual phenomenon. The
    substrate rebuild rejects projection: visuals before logic,
    transitions before snapshots, motion before structure.
  - **Snapshot + motion as a pair.** chan-wire (snapshot) +
    chan-anim (motion).

## Substrate working mode (carried forward)

  - Don't propose niche bundles. User-named frames stand alone.
  - Don't offer "next options" menus proactively. Wait for the user
    to name the next frame.
  - When designing fixes, first ask: what does the Go side do?
    Channels back-pressure locally; gates back-pressure locally.
    Coordinator-shaped fixes are training-data drift.
  - Use Claude Code as a fabricator, not a co-designer.
  - Do not collapse temporal phenomena into static snapshots without
    keeping a separate temporal view alongside.
  See `memory/feedback_substrate_vs_coordinator_bias.md` and
  `memory/feedback_visual_first_default.md`.

## Open branches

  - `main` — production trunk, tip fbaaa2a (Gate A merge).
  - `task/runtime-substrate-rebuild` — this branch. Rebuild work.
  - `task/in0-readgate-emission-ack` — parked at dbab83c. Reference
    for the old shape; **do not merge, do not delete** until first
    green R1–R5 contract test (auto-retire signal).

Branch hygiene: no merge to main without explicit sign-off. Delete merged branches without re-asking. Force-push needs sign-off.
Cwd for tsc/tests/check:loc/build: tools/topology-vscode/ (Bash resets cwd — chain cd or use absolute paths).
Stop hook active: scripts/stop-checks.sh runs go build / tsc / check:loc / npm run build on relevant changes and blocks stop on failure.
If user surfaces unrelated friction, log to docs/planning/visual-editor/session-log.md and open a fresh task/<short-kebab>.

ALWAYS — at end of session, overwrite docs/planning/visual-editor/handoff.md with a freshly-rendered prompt tailored to the state you're leaving the branch in, and commit it on the task branch. Do not rely on chat history; the next AI may be a fresh model with no transcript. The rendered handoff must itself contain this same ALWAYS clause so the loop is self-perpetuating across sessions. Use docs/planning/visual-editor/continuation-prompt-template.md as the structural source of truth; update the template when an invariant changes.
