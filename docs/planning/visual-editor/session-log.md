# Visual editor — real-world session log

Append-only log of friction surfaced while actually using the visual
editor (the VS Code extension at `tools/topology-vscode/`). One entry
per session. Brief and concrete: what was attempted, what jerked /
stalled / surprised / produced wrong Go, rough time/feel.

This log is the primary artifact driving post-v0 work. Rewrites and
fixes are justified by patterns here, not by speculative planning.
See the parent plan at [../visual-editor-plan.md](../visual-editor-plan.md)
for the surrounding posture, and [audits.md](audits.md) for the
audit registry.

## Entry format

```
## YYYY-MM-DD — <short task description>

**Branch:** task/<branch-name>
**Mode:** edit / smoothness audit / replay review / etc.
**Duration:** ~Nm

- Observation 1 (where, what, what was expected vs what happened)
- Observation 2
- ...

**Followups (candidates, not commitments):**
- ...
```

## Sessions

## 2026-05-03 — smoothness audit re-run on rebuilt pulse engine

**Branch:** task/fix-pulse-overlap
**Mode:** smoothness audit (audits.md #5)
**Start cost:** $279.83

Scope: pan, zoom, node drag (no topology change), animation playback,
scrub, fold/unfold of existing folds, bookmark jump, replay, view
recall. Re-run against the rebuilt AnimatedEdge engine (single rAF,
arc-traveled SoT, per-edge queue, geometry-preserving swap, single
knob `PULSE_PX_PER_MS_AT_REF_TICK`). Logging only — no fixes during
pass.

- **Animation playback — riding label off-curve from dot.** The
  riding value label traces a slightly different curve than the dot
  along the same edge, independent of node dragging. Both are
  supposed to read from the same arc-traveled value, so this points
  at a position-derivation difference (e.g. label translate uses the
  point but not the path's local geometry/offset, or the dot's
  visible position differs from `getPointAtLength(arcTraveled)` due
  to the dashoffset window vs. tangent). Visible on stationary
  edges, so not a geometry-swap artifact.
  - Resolved in-session: two compounded causes. (1) Label read
    `arcTraveled` (back of the 20px dash window) instead of the
    dot's visual midpoint. (2) Label used a fixed screen-y offset,
    which on diagonals/curves has a component along the direction
    of motion, so the label visibly led/lagged the dot. Fix: named
    `PULSE_DASH_PX`, label reads `arcTraveled + PULSE_DASH_PX/2`,
    and offsets along the local path normal by
    `PULSE_LABEL_NORMAL_PX` (always toward screen-up). Dot and
    label now ride one curve, parallel-separated.
  - Sub-finding: at the end of a bezier edge (input-node edge),
    label rises slightly off the parallel curve just before the
    pulse finishes. Distinct from the parallel curve itself
    rising as the bezier flattens toward a horizontal target
    handle — user reports drift off that parallel track. Not
    explained by the current model (label arc tracks dot visible
    midpoint; normal taken at same arc point). Candidate causes
    not verified: visual centroid of a high-curvature dash drifting
    off arc midpoint, sub-pixel text baseline vs. dash centerline,
    eps-clamp on the last 0.5px of normal sampling. Deferred:
    user to capture screenshots; revisit with a real repro rather
    than another speculative patch. Four iterations already spent
    on this observation; pausing further changes per audit posture.
  - Evidence captured: three screenshots under
    [screenshots/](screenshots/) — `2026-05-03-pulse-label-end-bezier-1.png`
    through `-3.png`, bezier edge into `readGate1`. Shot 3 shows
    the label ~25–30px above-left of the dot at the target handle,
    visibly farther than the configured 10px parallel offset —
    real position discrepancy, not a parallel-curve perception.
    Leading hypothesis for next session: finite-difference tangent
    uses `eps ≤ 0.5px` (1px sampling window); near a fast-flattening
    bezier, `getPointAtLength` precision makes the tangent direction
    noisy, and noise in `n` is amplified 10× by the offset distance.
    Try a larger eps (4–6px) for tangent sampling.
  - User-suggested direction for next session: prefer a fix that
    does not rely on finite-difference tangent sampling at all.
    Possibilities to explore: derive the tangent analytically from
    the path's segment definition (e.g. parse the `d` string and
    evaluate the bezier derivative for the line route, or use the
    known H/V segment direction for snake/below routes); or skip
    the perpendicular-normal model entirely in favor of a fix that
    doesn't need a tangent at all. Sampling-based normals are the
    current weak point — replace the mechanism rather than tune
    its eps.
  - Resolved next session (same day, $283.34 → $285.65). Three
    layered changes in `AnimatedEdge.tsx`:
    1. Lifted reactflow's bezier control-point math into a local
       `buildPathGeom` helper. Both the `d` string and the analytic
       control points/segments now come from one source — no string
       parsing of our own output, no dependence on reactflow internals.
    2. Replaced finite-difference tangent sampling with analytic
       tangent. For straights, segment unit vector. For the cubic,
       Newton-invert `B(t) = path.getPointAtLength(labelArcSvg)` to
       recover `t`, then evaluate `B'(t)`. Point and tangent share
       `t` by construction, eliminating the eps-clamp mismatch that
       made the tail tangent disagree with the tail point. (An
       intermediate attempt that built a chord-arc LUT and scaled
       to SVG total was structurally wrong — chord arc isn't
       proportional to SVG arc on a curl, so the recovered `t` was
       still off. Newton inversion sidesteps the conversion.)
    3. The visible "label rising at end" was actually compounded by
       SVG `<text>` defaulting to `dominant-baseline: alphabetic` —
       the y coordinate was the baseline, so glyphs rendered ~9–11px
       *above* the translate point, stacking with the 10px normal
       offset. Setting `dominantBaseline="central"` made the
       configured offset visually match.
  - Lesson: when a "geometry" bug visually exceeds the configured
    parameter by ~one font height, suspect text baseline before
    suspecting more geometry. Cheap to check, easy to overlook.

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

## 2026-05-04 — smoothness audit re-run with always-on probe

**Branch:** task/<TBD>
**Mode:** smoothness audit (audits.md #5)
**Start cost:** $<TBD>

Scope: pan, zoom, node drag (no topology change), animation
playback, scrub, fold/unfold of existing folds, bookmark jump,
replay, view recall. The pulse visual probe is always on as of
`d771871` (main); periodically run `window.__pulseProbeReport()`
in the webview devtools console — empty array is a clean result
worth recording, non-empty entries are fresh friction.

- (observation 1)
- (observation 2)

**Probe output:**
- (paste/summarize `__pulseProbeReport()` results here, including
  the empty-array case for any edge classes exercised)

**Followups (candidates, not commitments):**
- ...

