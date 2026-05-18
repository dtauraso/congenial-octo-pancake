# Memory Index

## Background (stable rules — workflow, hygiene, ergonomics)

These rarely change; skim once per session and apply throughout.

- [user_background.md](user_background.md) — User designs concurrent dataflow systems with circuit-style wiring
- [feedback_workflow_post_v0.md](feedback_workflow_post_v0.md) — Post-v0 workflow: commit freely on task branches, ≥$5 cost-marker rule, friction-driven, audit registry, no AI-system lock-in
- [feedback_branch_cleanup.md](feedback_branch_cleanup.md) — Delete task branches locally and on remote once merged into main, without re-asking
- [feedback_memory_location.md](feedback_memory_location.md) — Save memory files only to repo `memory/`; skip the local Claude memory dir for this project
- [feedback_file_size_budget.md](feedback_file_size_budget.md) — Refactor any source file ≥ 200 LOC; target ≤ 100 LOC. Run `npm run check:loc` from `tools/topology-vscode/`.
- [feedback_open_files.md](feedback_open_files.md) — Always open files in VS Code (`code <path>`), not Safari or other apps
- [feedback_bash_cwd_persistence.md](feedback_bash_cwd_persistence.md) — Bash cwd persists across calls; use absolute paths for destructive ops
- [feedback_git_status_uall.md](feedback_git_status_uall.md) — Never use `git status -uall`; recurses into large untracked trees and can hang/OOM

## Active (project/substrate state — may go stale, re-verify against code)

Each entry can drift; if it conflicts with current code, update or remove the memory rather than acting on it.

- [project_architecture.md](project_architecture.md) — Concurrent timeline system with lateral inhibition
- [project_sustained_activity.md](project_sustained_activity.md) — Partitions should cycle through hierarchy of values as sustained self-activity
- [project_substrate_visual_vocabulary.md](project_substrate_visual_vocabulary.md) — Sim-substrate visual vocabulary is chan→wire + per-node running indicator (with reloop); goroutine and select are not separate visual primitives
- [project_industry_pattern_deferrals.md](project_industry_pattern_deferrals.md) — Visual-editor gaps from the 2026-05-03 industry-pattern review that are deferred until matching friction appears
- [project_pulse_label_offset_rule.md](project_pulse_label_offset_rule.md) — Pulse-label offset rule splits per route kind; mixing them shows up as tangent slip in the probe log
- [project_local_clocks_beat_global_runner.md](project_local_clocks_beat_global_runner.md) — Per-instance clock locality helped the pause-freeze fix, but recency/surface/problem-shape/written contracts also did. Don't use ease-of-fix as a single-factor substrate signal.
- [project_graph_node_pulse_coordination.md](project_graph_node_pulse_coordination.md) — UNRESOLVED: cross-node pulse coordination still off after unified-sim-clock work; next session needs a specific symptom before scanning
- [feedback_specify_substrate_layer_first.md](feedback_specify_substrate_layer_first.md) — State the substrate-layer answer before/alongside the visible-layer spec; implicit substrate slots get filled with coordinator-shaped defaults from training data
- [feedback_substrate_vs_coordinator_bias.md](feedback_substrate_vs_coordinator_bias.md) — Before fixing substrate code, name the contract violated, not the symptom. Knob-tuning (interval, cap, timeout) is the wrong shape — find the missing local signal. Folds in: substrate cycles must be paced by the visual layer.
- [feedback_visuals_scrutiny.md](feedback_visuals_scrutiny.md) — Visual fixes should use general mechanisms over point patches; expect re-evaluation against later observations
- [feedback_per_emit_simtime_anchoring.md](feedback_per_emit_simtime_anchoring.md) — For emit→pulse animations, anchor each instance at its emit simTime and render concurrently; head-of-queue serial mount is the wrong shape (validated 2026-05-04)
- [feedback_run_is_input_only.md](feedback_run_is_input_only.md) — Node bodies use RAF polling (self-woken), not event-driven wakeup. Bodies check `wire.canAccept` as guard, do NOT subscribe to wire phase changes.
- [feedback_industry_bug_class_scan.md](feedback_industry_bug_class_scan.md) — Before declaring an animation/timing/state/IPC change ready, scan against the well-known bug-class catalog and name the class in the working text
- [feedback_webview_devtools_frame.md](feedback_webview_devtools_frame.md) — VS Code webview devtools default to the outer wrapper frame; prefer file-bridge round-trips over `typeof window.X` for verification
- [feedback_runner_errors_probe_first.md](feedback_runner_errors_probe_first.md) — When the editor hangs/decouples, read `../.probe/runner-errors-last.json` first; one thrown listener often explains compound UI symptoms
- [feedback_cost_overruns.md](feedback_cost_overruns.md) — Catalog of session cost overruns; pattern is speculative tooling on top of an unverified diagnosis
- [project_runstart_concept_needed.md](project_runstart_concept_needed.md) — Substrate-r has no shared tick-0/run-start; seed-as-prefill + InputBody self-start RAF are mount hacks. Replace with one substrate concept so seed and in0 are the same kind of thing.
