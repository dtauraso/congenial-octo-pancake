## 2026-05-04 — ack edge junction jerk

**Branch:** task/ack-edge-junction-jerk
**Mode:** smoothness audit follow-up (audits.md #5)
**Start cost:** $336.67

Scope: per-edge speed inconsistency / Ack-edge corner jerk from
the 2026-05-04 audit. Symptom: pulse moves at constant speed but
the riding label snaps abruptly at corners.

- **Root cause: queryTangent walked straight-only `geom.cum[]`
  while `svgArc` measured the real SVG path including rounded
  Q-corners.** At each cum boundary the tangent flipped 90° in
  one frame → label translated ~14px diagonally. Fixed by
  always finite-differencing on the SVG path (the previously-
  gated "mixed routes (none today)" fallback at the bottom of
  `queryTangent` was the right code; the early `kind === "straight"`
  return shadowed it).
- **Geometric corner-rotation wobble.** With the snap fixed, the
  label's perpendicular offset still rotated 90° through corners
  → ~18px sweep. User accepted the wobble on snake (looks like a
  bank), pushed back on below-route corners (label inside the U
  cut across the bend rather than banking).
- **Final placement spec (user-driven):** label always above
  horizontal segments, always right of vertical segments, smooth
  parallel path. Implemented as `nx = |ty|, ny = -|tx|` for
  axis-aligned routes (snake/below) — perpendicular for first-
  quadrant tangents, smooth quarter-circle blend through 90°
  corners. Cubic/line routes kept the classic perpendicular-
  with-upward-bias because their tangents leave the first
  quadrant and the absolute-value rule produces tangent slip
  there. Probe (threshold lowered to 0.01px) caught a 5.27px
  tangent slip when the new rule was first applied
  unconditionally — the split per route kind cleared it. Rule
  recorded at [memory/project_pulse_label_offset_rule.md](../../../memory/project_pulse_label_offset_rule.md).
- Corner radius `r` increased to 15 (from 8) for visible banking
  on inner curves; below-route corridor offset bumped 40 → 80
  so the inner radius isn't pinched by short vertical legs.

**Probe output (final):** `{"ts": 1777884184038, "entries": []}`
clean across the smoothness scope at 0.01px threshold.

**Followups (candidates, not commitments):**
- Sweep remaining smoothness scope (pan/zoom/scrub/fold/bookmark/
  replay/view-recall) with the lowered probe threshold.
- Decide whether to keep the probe threshold at 0.01 long-term
  (catches noise, generates churn) or restore to 1.5 (the
  original "real artifact" threshold).
