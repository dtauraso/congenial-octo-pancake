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

## 2026-05-03 — match cascade SVG pulse speed (0.08 px/ms)

**Branch:** task/pulse-speed-svg-match
**Mode:** smoothness audit follow-up — try the reference diagram's speed
**Start cost:** $319.86

After halving to 0.03 (prior entry), pulled the speed from
[diagrams/topology-chain-cascade.svg](../../../diagrams/topology-chain-cascade.svg)
("Edge pulses at 80 px/s"). Set
`PULSE_PX_PER_MS_AT_REF_TICK` → 0.08 in
[AnimatedEdge.tsx:251](../../../tools/topology-vscode/src/webview/rf/AnimatedEdge.tsx#L251).
Build + 157 tests green. User to judge feel; expected to be
noticeably faster than the prior 0.06 baseline that was called
"too fast", so revert is on the table.

## 2026-05-03 — slow pulse speed (1/2×)

**Branch:** task/slow-pulse-speed
**Mode:** smoothness audit fix (audits.md #5, "pulses too fast overall")
**Start cost:** $319.14

Per-edge speed inconsistency and probe re-run still open. Global
speed only this session. Single knob `PULSE_PX_PER_MS_AT_REF_TICK`
in [AnimatedEdge.tsx:251](../../../tools/topology-vscode/src/webview/rf/AnimatedEdge.tsx#L251)
halved 0.06 → 0.03. Everything visual (dot, dash window, riding
label) scales from this constant, so no per-edge follow-up needed
for the global tune. Build + 157 tests green. User to verify feel
in webview.

## 2026-05-03 — smooth node drag (un-snap)

**Branch:** task/smooth-node-drag
**Mode:** smoothness audit fix (audits.md #5, item 1 from prior log)
**Start cost:** $317.49

Drag-jerkiness root cause was not render cost (5 nodes / 6 edges).
ReactFlow had `snapToGrid={true}` with `snapGrid=[24, 24]` set on the
canvas — node position quantized to 24px steps during drag, which
*is* the "stepped/laggy rather than continuous" feel reported. Fix:
drop both props (and the unused `GRID` constant). No snap on drop
either, matching the prior log's note that no grid size was chosen.
Build + 157 tests green. User to verify in webview.

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

**Branch:** task/probe-rerun-smoothness
**Mode:** smoothness audit (audits.md #5)
**Start cost:** $320.85

Scope: pan, zoom, node drag (no topology change), animation
playback, scrub, fold/unfold of existing folds, bookmark jump,
replay, view recall. The pulse visual probe is always on as of
`d771871` (main); periodically run `window.__pulseProbeReport()`
in the webview devtools console — empty array is a clean result
worth recording, non-empty entries are fresh friction.

- The probe output is now persisted to `.probe/pulse-last.json`
  via a new webview→host message (`pulse-probe-dump`). The webview
  installs `__pulseProbeDump()` eagerly on module load; entries
  also auto-dump 500ms after each push, and a 5s heartbeat
  refreshes the file whenever any pulse rendered since the last
  dump (so clean runs produce confirmed `entries: []` evidence
  without a console call).
- Tooling friction: getting the bridge wired ate the session.
  Eager init was guarded by `!__pulseProbeLog` (broke on hot
  reload — fixed). `acquireVsCodeApi()` re-throws on the second
  call when the bundle re-executes against the same context
  (`retainContextWhenHidden: true`) — fixed by caching the API
  on `window.__vscodeApi`. Two spec attempts (cache-bust query,
  auto-reload watcher) caused VS Code-internal `toUrl` errors
  and were reverted. The final wrong-frame mistake (devtools
  console attached to outer wrapper, not the iframe running the
  bundle) was the longest dead-end — heartbeat dump removes the
  need for a console diagnostic, so the trap can't recur.

**Probe output:**
- First clean run after the bridge landed: `{"ts": 1777880387755,
  "entries": []}`. Scope exercised was minimal (node drag) — see
  followups for broader coverage.

**Followups (candidates, not commitments):**
- Drive the rest of the smoothness scope (pan, zoom, scrub, fold,
  bookmark jump, replay, view recall) and capture each as a
  separate dump (or accept heartbeat-overwritten last-state).
- If recurring drift entries appear, dig into the bezier-end
  label-drift hypothesis from the prior session (eps-precision
  in finite-difference tangent on flattening curves).

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

## 2026-05-03 — industry-standard-pattern review (visual editor)

**Branch:** task/industry-pattern-review
**Mode:** AI-driven audit (CLAUDE.md "what did the rest of the world
converge on?" rule). No implementation this session — output is a
coverage matrix and triage of which gaps merit task branches.

Reference set: yEd, draw.io (mxGraph), ELK, the React Flow ecosystem
(incl. xyflow Pro examples), JointJS. Patterns surveyed are the
ones a typical graph-editor user expects on first contact.

### Coverage matrix

| Pattern | Have it? | Where / gap | Rough effort |
|---|---|---|---|
| Pan / zoom / fit-view on load | Yes | [app.tsx:892](tools/topology-vscode/src/webview/rf/app.tsx#L892) (`fitView`), `minZoom 0.1`, `maxZoom 4` | — |
| Snap-to-grid | Yes | [app.tsx:879-880](tools/topology-vscode/src/webview/rf/app.tsx#L879-L880) (`GRID=24`) | — |
| Alignment guides during drag | Partial | [app.tsx:681-707](tools/topology-vscode/src/webview/rf/app.tsx#L681-L707) — single-node only; multi-node selection drag clears guides intentionally | S — extend to bbox of selection |
| Marquee / lasso selection | Yes | `selectionOnDrag`, `SelectionMode.Partial`, `panOnDrag={[1]}` ([app.tsx:895-897](tools/topology-vscode/src/webview/rf/app.tsx#L895-L897)) | — |
| Multi-select drag | Yes (RF default) | — | — |
| Port-anchored handles | Yes | `sourceHandle`/`targetHandle`; 1-to-1 input invariant enforced ([app.tsx:474-482](tools/topology-vscode/src/webview/rf/app.tsx#L474-L482)) | — |
| Edge reroute (drag endpoint) | Yes | `onEdgeUpdate*` handlers | — |
| Orthogonal routing | Partial | `EdgeRoute = "line"\|"snake"\|"below"` ([schema.ts:62](tools/topology-vscode/src/schema.ts#L62)); snake is orthogonal but **sharp corners** ([AnimatedEdge.tsx:155-167](tools/topology-vscode/src/webview/rf/AnimatedEdge.tsx#L155-L167)) | S — replace `L` with rounded-corner arcs / `Q` |
| Rounded corners on orthogonal edges | **No** | sharp 90° corners only | folded into above |
| Auto-routing (avoid node overlaps) | **No** | corridor offset is fixed `+40`; no obstacle awareness | L — adopt a router (ELK, libavoid-js) or accept `route` field as authoritative |
| Edge labels | Partial | edges have a `label` (Go identifier, not display label); not rendered on canvas | M — render display label on `BaseEdge`, anchor near midpoint |
| Edge-label collision avoidance | **No** | n/a until labels render | M (after labels) |
| MiniMap / overview | **No** | no `MiniMap` import; only `Controls` | XS — drop in `<MiniMap />` |
| Zoom-to-fit shortcut | Partial | bridge exposes `fitNodes(ids)` ([app.tsx:255-261](tools/topology-vscode/src/webview/rf/app.tsx#L255-L261)) but no global `f` / `cmd-1` keybinding | XS — wire keybinding |
| Zoom-to-selection | Partial | `fitNodes` works on selection via bridge, no keyboard hook | XS |
| Undo / redo | Yes | scoped stacks (spec / viewer), gesture-aware via `data-undo-scope` ([app.tsx:140-236](tools/topology-vscode/src/webview/rf/app.tsx#L140-L236)) | — |
| Undo grouping at gesture level | Partial | `mutateBoth` groups spec+viewer for delete; multi-node drag pushes one history entry per node-drag-stop (not coalesced) | S — coalesce within a single selection-drag gesture |
| Copy / paste | **No** | no clipboard handlers | M — serialize selection subgraph, regen ids on paste |
| Duplicate (cmd-D) | **No** | — | S (after copy/paste plumbing) |
| Keyboard nav (arrows nudge, tab through nodes) | **No** | only delete + cmd-Z + space (onion swap) | S for arrow-nudge by GRID; M for tab cycle |
| Lane / swimlane containment | Partial | `Fold` placeholder collapses N nodes into one, **not** an open container holding children visually like a draw.io swimlane | L — different abstraction; would need parent-node support |
| Group / ungroup | Partial via folds | — | — |
| Node search / quick-jump (cmd-K palette) | **No** | — | S |
| Context menus | Partial | edge-kind and fold menus exist; no general node menu (rename/duplicate/etc.) | S |
| Keybinding cheatsheet / discoverability | **No** | — | XS — static panel |
| Touch / trackpad pan | Yes | `panOnScroll={true}` | — |
| Connect-validation feedback | Partial | port-conflict logged to console, no UI cue ([app.tsx:478-481](tools/topology-vscode/src/webview/rf/app.tsx#L478-L481)) | XS — toast or red handle flash |
| Diff / compare view | Yes (project-specific) | A-live / A-other / B-onion modes | — beyond category baseline |
| Auto-layout (one-shot) | **No** | manual placement only; ELK / dagre are canonical drop-ins | M |

### Triage — which gaps deserve a task branch

**High value, low effort (open branches when next friction surfaces):**
1. **MiniMap** — XS, drop-in `<MiniMap />`. Standard expectation; perceptual win for "where am I in this graph."
2. **Zoom-to-fit / zoom-to-selection keybindings** — XS, function already exists; bind `f` and `shift-f`.
3. **Rounded corners on `snake` route** — S, single edit in [AnimatedEdge.tsx:155-167](tools/topology-vscode/src/webview/rf/AnimatedEdge.tsx#L155-L167). Visual polish every other tool has.
4. **Connect-validation UI cue** — XS, replace `console.warn` for port-already-wired with a transient red flash on the rejected target handle.

**High value, medium effort (branch when friction is logged):**
5. **Copy / paste / duplicate** — M, baseline expectation. Subgraph serialization with id regeneration; hooks into existing `mutateSpec` + `scheduleSave`.
6. **Edge display labels** — M; channel-name `label` is currently invisible, surprising once more than a handful of edges are wired.
7. **Multi-node alignment guides** — S, extend matcher to use selection-bbox center.
8. **Drag-stop undo coalescing** — S, one history entry per multi-node drag gesture.

**High value, high effort (hold until friction insists):**
9. **Auto-routing with obstacle avoidance** — L. Biggest gap vs. yEd/draw.io. Defer until "edges crossing through nodes" gets logged. Canonical answer is ELK or libavoid-js; prefer adopting over rolling.
10. **Auto-layout (dagre / ELK one-shot)** — M-L. Defer until a 50+ node spec generates complaints about hand-placement.

**Low priority / different shape:**
- Swimlanes — fold abstraction already covers "collapse a region"; container-style lanes are a different mental model.
- Keyboard tab-through-nodes — diminishing return for graphs of this size.

**Branch-opening recommendations (proposed, not started):**
- `task/fix-minimap-add` (item 1).
- `task/fix-zoom-keybindings` (item 2).
- `task/fix-snake-rounded-corners` (item 3).
- Bundle items 1–4 into a single `task/industry-quick-wins` branch if landed together (≥$5 cost-marker territory).
- Items 5–8 wait for explicit friction logged in this session-log
  before opening branches.
- Items 9–10 stay dormant per post-v0 friction-driven posture.

### Addendum — patterns missed in the first pass

Surveyed after the quick-wins shipped; not in the original matrix.

| Pattern | Have it? | Notes | Effort |
|---|---|---|---|
| Export to PNG / SVG | **No** | Universal in yEd/draw.io/RF examples; `react-flow` has `toPng`/`toSvg` helpers | XS |
| Tooltips on hover | **No** | Long ids / truncated sublabels have no hover reveal | XS |
| Bend points / waypoints on orthogonal edges | **No** | draw.io's signature gesture; our `route` is one of three presets, no per-edge waypoints | M-L |
| Node resizing handles | **No** (intentional) | Sizes encode node role; deviation from yEd/draw.io is probably correct here | — |
| Snap to other nodes' edges (not just centers) | **No** | Guides match centers within `ALIGN_TOL`; edge-flush snapping is common | S |
| Outline / structure panel | **No** | yEd-style tree of nodes; probably overkill at our scale | — |
| Z-order controls (send to front/back) | **No** | Not needed until nodes overlap meaningfully | — |
| Properties inspector sidebar | **No** | Editing arbitrary `props` is piecemeal (rename, sublabel only) | M |

**Triage:** export and tooltips are the only clean "everyone has
this, it's cheap" gaps. Holding both per friction-driven posture;
neither has caused observed pain yet.



### 2026-05-03 — Implementation-pattern audit (different axis)

Reframed the industry-pattern review from *missing user features* to
*hand-rolled code that duplicates library primitives*. Scanned
`tools/topology-vscode/src/` and produced
[industry-pattern-audit.md](industry-pattern-audit.md): 19
"reimplemented" items (R1-R19) with canonical replacements + 7
"missing" react-flow/ecosystem features (M1-M7). Out-of-scope items
(Yjs, Storybook, telemetry, mobile, react-query) explicitly listed
and excluded.

Key cross-references with the deferrals memo:
- R14 (elkjs/libavoid-js routing) subsumes the deferred *auto-routing
  with obstacle avoidance* item.
- M1 (`isValidConnection`) subsumes the reject-flash quick win — no
  flash needed if the drag never starts.
- M3 (react-flow `EdgeLabelRenderer`) is a prerequisite for the
  deferred *edge display labels* item.
- R19 coordinates with deferred *snap to other nodes' edges* and
  *multi-node alignment guides*.

Audit doc is the spec for a future session; nothing landed here.
Suggested cluster order: state→zustand (R1-R3) → panels→React
(R4-R7) → geometry/routing (R14-R18, blocks on lib choice).
