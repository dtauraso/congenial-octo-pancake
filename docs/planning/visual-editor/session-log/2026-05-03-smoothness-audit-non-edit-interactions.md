## 2026-05-03 — smoothness audit (non-edit interactions)

**Branch:** task/smoothness-audit
**Mode:** smoothness audit (audits.md #5)
**Start cost:** $271.69

Scope: pan, zoom, node drag (no topology change), animation playback,
scrub, fold/unfold of existing folds, bookmark jump, replay, view
recall. Logging only — no fixes during pass.

- **Node drag — jerky during drag.** Dragging a node does not track
  the cursor smoothly; motion feels stepped/laggy rather than
  continuous. User would like smooth tracking during drag. Considered
  snap-to-grid on drag end, but no chosen grid size — too large a
  snap defeats the point of placing freely; no standard picked yet.
  (Open question, not a fix decision.)
- **Animation playback — pulses too fast overall.** Pulses and their
  attached data labels travel along edges very fast — hard to read
  the value as it moves.
- **Animation playback — per-edge speed inconsistency.** Speed is
  not consistent across edges. The Ack edge's pulse moves ~3× (or
  more) faster than the pulse leaving the input node. Suggests
  per-edge duration is decoupled from edge length (or vice versa).
