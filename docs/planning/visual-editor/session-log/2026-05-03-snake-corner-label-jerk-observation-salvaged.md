## 2026-05-03 — snake-corner label jerk observation (salvaged)

**Branch:** task/smoothness-audit-always-on-probe (superseded; log
entry salvaged on 2026-05-04 — code rewrite was overtaken by
[ack edge junction jerk](#2026-05-04--ack-edge-junction-jerk) work
that solved the same family of artifacts via a different route).

- **Snake-corner label jerk**
  ([1](screenshots/2026-05-03-snake-corner-label-jerk-1.png) /
  [2](screenshots/2026-05-03-snake-corner-label-jerk-2.png) /
  [3](screenshots/2026-05-03-snake-corner-label-jerk-3.png)).
  At the elbow of a snake route, the riding label
  jumps across the wire and appears to curve/teleport through the
  corner instead of pivoting cleanly. Two structural causes:
  1. Per-segment normal + the `if (ny > 0) flip` rule put the
     label on different sides of the wire on the two legs
     (above on the horizontal leg; left on the vertical-down
     leg), so at the junction the side flips.
  2. Within ~PULSE_DASH_PX of the elbow, dot-midpoint arc can
     straddle the corner; tangent is whichever leg owns that
     arc — a step function, not continuous — so the label snaps.

**Proposed fix at the time — parallel-track offset path (drafted,
not landed; the actual fix took a different shape — see ack-edge
entry above for the `nx = |ty|, ny = -|tx|` rule that shipped):**

Build, alongside `PathGeom`, an `OffsetPathGeom` representing a
*parallel track* offset by `PULSE_LABEL_NORMAL_PX` to one
consistent side. The label rides this path; its position is read
directly from `offsetPath.getPointAtLength(...)`. No per-frame
normal computation, no flip rule, no tangent query for label
placement.

Key properties (the "locked on a parallel track" model
the user asked for):

- **Mitered right-angle corners.** For snake/below routes the
  offset path is an `M L L L …` polyline whose vertices are the
  miter intersections of the offset legs. The label travels
  straight along each offset leg and pivots at the miter point —
  no curving through the corner.
- **Per-segment correspondence**, not global-fraction mapping.
  When the dot is at fraction `f` along leg *i* of the main
  path, the label is at fraction `f` along leg *i* of the
  offset path. At the elbow (dot exactly at the wire vertex)
  the label is exactly at the miter vertex. This avoids the
  outer/inner arc-length mismatch that a single global
  fraction would introduce.
- **Consistent side.** The offset side is chosen once per route
  from its topology so "up-and-right of the wire" is honored on
  both legs of a snake — never via a per-segment ny-sign flip.
- **Cubic routes.** Offset the analytic cubic by displacing
  both control points along their endpoint normals; query
  position at the same `t` the dot uses (we already recover `t`
  via Newton inversion). Same continuity guarantee.

**Followup that did open from this seed:**
- Industry-standard pattern review across the plugin — landed as
  the 2026-05-03 industry-pattern review entry below.

**Recommended branches (not yet opened, need design input):**
- `task/visualize-gate-buffer-state` (row #4) — render "waiting on second input" affordance.
- `task/backpressure-slack-envelope` (row #1) — animate the ack-wait interval.
- `task/stepping-semantics-doc` (row #6) — clarify "step one fire" vs "step one cycle" in self-sustaining mode.
