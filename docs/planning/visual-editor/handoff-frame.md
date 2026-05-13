# Handoff — Conceptual frame and working mode (carried forward)

## Conceptual frame

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
  - **Decentralized, not distributed.** "Decentralized" means *no
    center exists* — the property is genuinely local. "Distributed"
    means *the center is reconstructed from pieces*, which is what
    most coordinator-shaped designs do under a different name.
    Resolved tick = edge cohort is genuinely decentralized: every
    observer can recover it from local activity, no coordinator
    assembles a global story.

## Substrate working mode

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

  - `main` — production trunk; check `git log` for tip.
  - `task/substrate-slot-in-node` — this branch. Model promoted
    (MODEL.md authoritative); ready to start first code commit.
  - `task/in0-readgate-emission-ack` — parked; reference for the
    old shape. **Do not merge, do not delete** until first green
    contract test on the new substrate (auto-retire signal).

Branch hygiene: no merge to main without explicit sign-off. Delete
merged branches without re-asking. Force-push needs sign-off.
Cwd for tsc/tests/check:loc/build: tools/topology-vscode/ (Bash
resets cwd — chain cd or use absolute paths).
Stop hook active: scripts/stop-checks.sh runs go build / tsc /
check:loc / npm run build on relevant changes and blocks stop on
failure.
If user surfaces unrelated friction, log to
docs/planning/visual-editor/session-log.md and open a fresh
task/<short-kebab>.

## ALWAYS clause

(See handoff.md — same clause applies.)
