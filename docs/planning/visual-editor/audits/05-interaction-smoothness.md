### 5. Interaction smoothness

**What it checks.** All non-edit interactions feel smooth: pan,
zoom, node drag (without changing topology), animation playback,
scrub, fold/unfold of existing folds, bookmark jump, replay
playback, view recall. Speed is consistent. No visual jerks under
ordinary input.

**Backed by.** Nothing automated. This is narrative — the user
drives the editor, narrates what feels off, the assistant logs
observations to `session-log.md`.

**Passing.** A complete pass through the non-edit interactions
without the user noticing speed inconsistency or visual jerks.

**Cadence.** **Gates structural editing.** Re-run after any change
that touches rendering, animation, motion, or React Flow config.
On demand otherwise.

**Cost.** Model time during the live session + log writing
(typically <$5 alone — bundle with first 1–2 fixes for cost-marker
purposes per the ≥$5 rule).

---
