# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

---

Continuing on wirefold, branch `task/runtime-substrate-rebuild` (off
`main`). Gate A passed; this is the rebuild branch. Port-plan
**step 1 is done in the editor** (new `src/substrate/` module, cap=0
chosen, branched at [_handle-load.ts](../../../tools/topology-vscode/src/webview/rf/app/_handle-load.ts)).
Next work is **port-plan step 2**: per-node running indicator +
reloop glyph.

State at handoff:
  Local on `task/runtime-substrate-rebuild`, no remote yet (push on
  first commit).
  Working tree has `topology.view.json` modified (incidental editor
  pan/zoom from prior session; not part of rebuild work — leave it or
  discard, do not commit as a rebuild change).
  Tests/build/tsc/check:loc clean at step 1 commit (218/218 vitest).

## Step 1 build notes (decision audit)

Initial sketch was a standalone HTML at
`docs/planning/sim-substrate/chan-wire-driven.html` driven by an
embedded topology snapshot. User flagged this as "test on HTML, then
test in RF" double-build — corrected to land directly in the editor
webview. The standalone HTML was deleted before commit. Lesson: the
chan sketches were standalone *because they were specs*; step 1 is
the renderer, which lives next to the mess it replaces. Future port
steps should default to "in the editor" unless there's a reason
otherwise.

Substrate plugs into the existing event-bus by emitting `EmitEvent`
(same shape the legacy runner emits), so AnimatedEdge renders
unchanged. The 1500ms emit interval is a placeholder — step 3 (R1
FIFO test) replaces it with an ack-driven release.

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

**Port-plan step 2: per-node running indicator + reloop glyph.**
Spec lives in [../sim-substrate/rebuild-plan.md](../sim-substrate/rebuild-plan.md)
§"Visual layer" (item 2). No standalone sketch — prose-only spec.
The glyph is on a node when its handler is currently executing; the
reloop variant is for nodes whose own output feeds their own input.
Pinned by R5 at step 3.

Land it in the same `src/substrate/` module that step 1 introduced.
The substrate currently emits only `EmitEvent`; step 2 should emit
`FireEvent` (same shape the legacy runner uses on the event-bus) so
existing webview UI can pick up node-running state without a new
message type. Verify in the editor that loading the 2-node topology
shows tokens crossing the wire AND a running indicator on the
firing node.

Do **not** start step 3 (R1–R5 contract tests) in the same commit.
One step per commit per the plan doc.

Budget: ~$10. Same hard cap and reassess discipline as step 1
(below) — if it spirals past $25, stop and write the broken-
assumption note in rebuild-plan.md before continuing.

## Hard cap and reassess trigger (carried forward from step 1)

Each port-plan step gets a per-step hard cap (default $25 unless
stated otherwise). If a step has not produced its working
deliverable by the cap, stop and reassess: write a one-paragraph
note in [../sim-substrate/rebuild-plan.md](../sim-substrate/rebuild-plan.md)
naming which assumption broke (renderer location? buffered model?
topology shape? something else?), and surface to the user before
spending more. The point is to find substrate-design problems
cheaply at the current step rather than later after more code has
piled on top. Sunk-cost reasoning is the failure mode this cap
defends against — do not raise the cap mid-spiral without explicit
user sign-off.

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
