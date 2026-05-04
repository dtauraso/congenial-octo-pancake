# Memory Index

- [project_architecture.md](project_architecture.md) — Concurrent timeline system with lateral inhibition
- [user_background.md](user_background.md) — User designs concurrent dataflow systems with circuit-style wiring
- [project_sustained_activity.md](project_sustained_activity.md) — Partitions should cycle through hierarchy of values as sustained self-activity
- [project_backpressure_pattern.md](project_backpressure_pattern.md) — Latch + AND gate backpressure pattern: latches hold values, AND gates control release, ack signals prevent overwrite
- [feedback_open_files.md](feedback_open_files.md) — Always open files in VS Code (`code <path>`), not Safari or other apps
- [feedback_workflow_post_v0.md](feedback_workflow_post_v0.md) — Post-v0 workflow: commit freely on task branches, ≥$5 cost-marker rule, friction-driven, audit registry, no AI-system lock-in
- [feedback_visuals_scrutiny.md](feedback_visuals_scrutiny.md) — Visual fixes should use general mechanisms over point patches; expect re-evaluation against later observations
- [feedback_branch_cleanup.md](feedback_branch_cleanup.md) — Delete task branches locally and on remote once merged into main, without re-asking
- [feedback_memory_location.md](feedback_memory_location.md) — Save memory files only to repo `memory/`; skip the local Claude memory dir for this project
- [feedback_bash_cwd_persistence.md](feedback_bash_cwd_persistence.md) — Bash cwd persists across calls; use absolute paths for destructive ops
- [feedback_git_status_uall.md](feedback_git_status_uall.md) — Never use `git status -uall`; recurses into large untracked trees and can hang/OOM
- [project_industry_pattern_deferrals.md](project_industry_pattern_deferrals.md) — Visual-editor gaps from the 2026-05-03 industry-pattern review that are deferred until matching friction appears
- [feedback_webview_devtools_frame.md](feedback_webview_devtools_frame.md) — VS Code webview devtools default to the outer wrapper frame; prefer file-bridge round-trips over `typeof window.X` for verification
- [feedback_cost_overruns.md](feedback_cost_overruns.md) — Catalog of session cost overruns; pattern is speculative tooling on top of an unverified diagnosis
- [project_pulse_label_offset_rule.md](project_pulse_label_offset_rule.md) — Pulse-label offset rule splits per route kind; mixing them shows up as tangent slip in the probe log
