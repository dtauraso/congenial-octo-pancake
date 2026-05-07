# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

---

Continuing on wirefold, branch `task/sim-substrate-sketches` (off
`main`, tip `c587db5`). This is a short-lived doc-only branch holding
steps 1–3 of the cheapest-path plan. It will merge to `main` once
step 3 lands and Gate A is signed off, then the rebuild work moves
to a new branch `task/runtime-substrate-rebuild`.

State at handoff:
  Local + origin/task/sim-substrate-sketches at c587db5.
  Working tree carry: `M topology.view.json` (long-standing, do not
  commit).
  Tests/build untouched this session — last verified 230/230 +
  tsc/check:loc/build clean at 5a8948a.

## Why a new branch (read first)

Steps 1–3 of the cheapest-path plan are doc-only sketches and a plan
doc. They were briefly committed onto the parked
`task/in0-readgate-emission-ack` branch and then moved off because
the parked branch is "park, do not merge until rebuild's first green
contract test." Putting docs there hid them from `main` for weeks.
The new pattern: doc work that should be visible from `main` lives
on its own short-lived branch, mergeable as soon as it stabilises.

## What landed this session

**Steps 1 and 2 of the cheapest-path plan executed; index page added.**

  - **Step 1 (cf2beaa):** goroutine + scheduler HTML pair under
    [../sim-substrate/](../sim-substrate/).
    [goro-sched.html](../sim-substrate/goro-sched.html) — runQ FIFO →
    single CPU slot with quantum bar → blocked set with reason.
    [goro-sched-wire.html](../sim-substrate/goro-sched-wire.html) —
    tokens flow runQ → CPU → exit, with park detour to a parked rail
    and arc back to runQ on unblock. Single P, quantum=3, voluntary
    park button.
  - **Step 2 (d3b1feb):** select HTML pair.
    [select.html](../sim-substrate/select.html) — readiness snapshot;
    lowest-index ready non-default fires; default fires only when no
    other ready.
    [select-wire.html](../sim-substrate/select-wire.html) — parallel
    feeler extension, one commits, the rest retract; parked-on-empty
    path; auto-mode cycles four scenarios.
  - **Tabbed index (b50b003 + c587db5):**
    [index.html](../sim-substrate/index.html) wraps all six sketches
    (chan-anim, chan-wire, goro-sched, goro-sched-wire, select,
    select-wire) in a single shell using iframes; deep-links via
    `#fragment`. Each sketch hides its inner nav strip when loaded in
    an iframe (`window !== window.parent`) so the wrapper's tabs are
    the only visible tab row, but each file remains useful
    standalone.

**Branch hygiene pass.** The repo had 18+ stale local/remote branches.
Now only three remain: `main`, `task/in0-readgate-emission-ack`
(parked, do not merge), `task/sim-substrate-sketches` (this branch).
Deleted: 5 merged-to-main locals, 7 merged remotes, 6 unmerged
dead-end locals, 4 unmerged dead-end remotes. The chan sketches were
copied off the parked branch (final state of a2b744b + 6ff06f1) onto
this branch so all six sketches sit together.

**Spend this session: ~$3.** Well under the $13 budget for steps 1+2
combined. No cost markers needed (sub-$5 per CLAUDE.md).

## How to view the sketches

  - VS Code Live Preview is installed (`ms-vscode.live-server`).
    Open [../sim-substrate/index.html](../sim-substrate/index.html)
    and run "Live Preview: Show Preview" — the six tabs swap between
    sketches in a webview pane with full JS.
  - Or open `index.html` in any browser via `file://`.

## Conceptual frame (carried forward)

  - **Logic state IS visible state.** No render/logic split. Every
    primitive is specified as visible-state-transition rules; data
    shape is derived from the visual, not the other way around. See
    [memory/feedback_visual_first_default.md](../../../memory/feedback_visual_first_default.md).
  - **The industry's projection bias.** Static abstractions get
    privileged because they're tractable for symbolic reasoners.
    They're lossy compressions of the actual phenomenon. The substrate
    rebuild rejects projection at every level: visuals before logic,
    transitions before snapshots, motion before structure.
  - **Snapshot + motion as a pair.** Every primitive sketch ships
    both views — chan, goroutine+scheduler, and select all follow
    this pattern. Snapshot answers "what is it holding?"; motion
    answers "what is it doing?"

## Next task — START HERE

**Step 3 of the cheapest-path plan: write
[../sim-substrate/rebuild-plan.md](../sim-substrate/rebuild-plan.md)
including the fresh contract set.** Budget: ~$8. Model: opus.

The plan doc must cover:
  - Substrate primitives (Chan, Goroutine, Scheduler, Select) and
    how they compose. Reference the six sketches as visible-state
    spec.
  - Fresh contract set covering: channel FIFO, select determinism
    rule, scheduler determinism, no-goroutine-runs-twice-per-step,
    animation-step-equals-state-transition.
  - Port plan: which existing topology pieces port to the new
    substrate, and the order. Pilot first (one inhibitor) before
    bulk port.
  - Auto-retire signal for `task/in0-readgate-emission-ack`: delete
    on first green rebuild contract test.

**Determinism choice for select:** the sketch uses lowest-index;
Go's runtime randomises. Decide here which the substrate uses and
why. (Lowest-index = trivial test stability. Random = matches Go.
Round-robin = fair, also test-stable.)

After step 3 lands:
  - **Gate A:** ~$22 spent across steps 1–3. Sketches + plan doc +
    contract set must be coherent enough to commit to. If not, redo
    step 3 before opening `task/runtime-substrate-rebuild`.
  - **Step 4:** open `task/runtime-substrate-rebuild` and start the
    first goroutine + chan implementation commit.

Do NOT skip ahead to step 4 before Gate A.

## What did NOT land this session

  - No rebuild plan doc yet (step 3 next).
  - No code changes to the actual sim/runner/cadence tree.
  - Chunks 4–7 of the prior in0-readgate-emission-ack plan and the
    structural-review-without-fixes task remain obsolete. Do not
    start them.

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

## Contract registry status (contracts.md)

  C6–C8 are marked **OBSOLETE** in the registry — pinned cadence/
  pulse/edgePending invariants whose subsystems the rebuild deletes.
  Do not extend them. The rebuild plan (step 3) defines a fresh
  contract set covering channel FIFO, select determinism, scheduler
  determinism, no-goroutine-runs-twice-per-step, and
  animation-step-equals-state-transition.

  C1–C5 stay live; they pin host-message and editor-save-path
  invariants that are not affected by the rebuild.

## Probe instrumentation (carried forward, will be replaced)

  - `.probe/stuck-pulse-last.json` / `-followup.json` / `-third.json`.
  - `.probe/runner-errors-last.json` (stuck-pending entries).
  - `.probe/timeline-last.json` for per-edge emit/anim sequences.
  - `RunnerProbe` toolbar latches `⚠ stuck-anim` / `⚠ stuck-pending`.
  - `window.__resetPulseLeak()` re-arms the one-shot.

These die in step 8 of the cheapest-path plan (bulk port, deletes
ride replacement commits). Don't invest in extending them.

## Open branches

  - `main` — production trunk.
  - `task/sim-substrate-sketches` — this branch. Doc-only. Mergeable
    to `main` after Gate A (step 3 done).
  - `task/in0-readgate-emission-ack` — parked at dbab83c. Reference
    for the old shape; **do not merge, do not delete** until the
    rebuild is far enough along that the user explicitly retires it.
    Auto-retire signal: delete on first green rebuild contract test.
  - `task/runtime-substrate-rebuild` — to be created after Gate A.

Branch hygiene: no merge to main without explicit sign-off. Delete merged branches without re-asking. Force-push needs sign-off.
Cwd for tsc/tests/check:loc/build: tools/topology-vscode/ (Bash resets cwd — chain cd or use absolute paths).
Stop hook active: scripts/stop-checks.sh runs go build / tsc / check:loc / npm run build on relevant changes and blocks stop on failure.
If user surfaces unrelated friction, log to docs/planning/visual-editor/session-log.md and open a fresh task/<short-kebab>.

ALWAYS — at end of session, overwrite docs/planning/visual-editor/handoff.md with a freshly-rendered prompt tailored to the state you're leaving the branch in, and commit it on the task branch. Do not rely on chat history; the next AI may be a fresh model with no transcript. The rendered handoff must itself contain this same ALWAYS clause so the loop is self-perpetuating across sessions. Use docs/planning/visual-editor/continuation-prompt-template.md as the structural source of truth; update the template when an invariant changes.
