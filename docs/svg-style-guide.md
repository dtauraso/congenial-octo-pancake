# Topology-chain-cascade.svg — Style Compilation

## Context
Reference compilation of the style conventions used in [diagrams/topology-chain-cascade.svg](diagrams/topology-chain-cascade.svg). Captures nodes, edges, labels, spacing, path routing, and animation patterns so future diagrams in this repo can match the house style without re-deriving it from the file. Intended as a companion to the rules in [CLAUDE.md](CLAUDE.md).

---

## 1. Canvas & Frame

- `viewBox="0 0 1380 740"`, no intrinsic width/height (scales to container)
- Root `font-family="ui-sans-serif, system-ui, sans-serif"`, `font-weight="400"`
- Background: full-bleed `<rect>` with `class="diagram-bg"`, `rx="8"` (fill `#fafafa`)
- Title centered at `(690, 30)`, `class="title-text"` — 16px, bold, `#222`
- Structural ASCII separators used between major sections: `<!-- ═══════ SECTION ═══════ -->`

## 2. Layout — Rows (y-bands) and Columns

The diagram is organized as vertical bands, each a logical row:

| Band | y-range | Contents |
|---|---|---|
| Top AND | 50–90 | `a0` pattern AND gate (center, x≈786–856) |
| Detector | 60–150 | `sbd0` (left top), `sd0` (left bottom), `sbd1`, `sd1` (right) |
| syncGate | 240–276 | syncGate (center, x≈680–750) |
| Pipeline | 280–340 | `in0 → readLatch → i0 → detectorLatch → i1` (all centered at y=310) |
| Gate row | 400–436 | `readGate` directly under `readLatch` |
| Annotation | 480–535 | yellow behavior-note box |
| Legend | 548–722 | color/description table |

Columns (pipeline x-centers): `in0≈60`, `readLatch/readGate=285`, `i0=545`, `detectorLatch/syncGate/a0≈815`, `i1=1105`, `sd1=1170`. Detector pair left of its inhibitor for i0, right of its inhibitor for i1 (mirror symmetry around pipeline).

## 3. Node Shapes

All `rect` (no symbol/use for styled shapes — renderer limitation, see CLAUDE.md exception).

| Role | Size (w×h) | rx | Class | Fill / Stroke |
|---|---|---|---|---|
| input | 80×60 | 6 | `.shape-input` | `#e0e0e0` / `#666` |
| latch | 70×36 | 6 | `.shape-latch` | `#e0f7fa` / `#00838f` (teal) |
| inhibitor | 90×60 | 6 | `.shape-inhibitor` | `#fff3e0` / `#e65100` (orange) |
| and-gate | 70×36 | 6 | `.shape-and-gate` | `#f3e5f5` / `#7b1fa2` (magenta) |
| pattern-and | 70×40 | 6 | `.shape-pattern-and` | `#e8eaf6` / `#283593` (indigo) |
| sbd0 (variant) | 110×40 | 20 (pill) | `.shape-sbd0` | `#ffebee` / `#c62828` (red) |
| sbd1 (variant) | 110×40 | 20 (pill) | `.shape-sbd1` | `#e3f2fd` / `#1565c0` (blue) |
| sd | 100×40 | 20 (pill) | `.shape-sd` | `#e8f5e9` / `#2e7d32` (green) |

Convention: **detectors are pills** (`rx=20`); **pipeline/control nodes are rounded rects** (`rx=6`). All strokes are `stroke-width: 2` on node shapes.

Note: `sbd0` and `sbd1` use different fills to distinguish left/right hierarchies even though they're the same role. This is a deliberate left/right hemisphere color cue.

## 4. Node Text

- Every node group wrapped in `<g id="node-X" data-role="..." [data-index="N"]>`
- Text classes: `.node-title` (12px), `.node-sublabel` (11px), `.node-type` (11px), all `text-anchor: middle`
- **Inline presentation attributes required** (renderer ignores CSS on text):
  - `font-weight="100"` on every label (very thin — house look)
  - `fill` set inline via a `.text-<role>` class that succeeds because it targets the `<text>` element directly
- Title color matches the node's stroke (e.g., inhibitor title is `#e65100`)
- 2-line nodes: title at `y+16`, second line at `y+30`; 3-line nodes: `y+20`, `y+35`, `y+50` from the rect top
- `in0` carries an inline sample sequence as third line: `[-1,1,1,-1]→`

## 5. Edge Classes — Semantics, Color, Style

Every edge kind is a CSS class on a `<g>` wrapper; the `<line>` or `<path>` inside inherits.

| Class | Color | Width | Dash | Arrow marker | Meaning |
|---|---|---|---|---|---|
| `.chain` | `#333` | 1.5 | solid | filled triangle | pipeline data advance |
| `.edge-connection` | `#2266aa` | 1.5 | solid | **open** V (blue) | read-port sample (old/new) |
| `.and-out` | `#283593` | 1.5 | solid | filled (indigo) | AND-gate reduction out |
| `.signal` | `#7b1fa2` | 1.5 | solid | filled (magenta) | ready/done pulse |
| `.feedback-ack` | `#7b1fa2` | **2.5** | **6 3** dashed | filled (magenta) | backpressure cycle closer |
| `.release` | `#00838f` | 1.5 | solid | filled (teal) | latch release |
| `.streak` | `#2e7d32` | 1.5 | solid | filled (green) | sd→sd same-sign chain |
| `.pointer` | `#e65100` | 1.5 | **4 3** dashed | filled (orange) | struct ref, not dataflow |
| `.future-out` | `#283593` | 1.5 | **4 3** dashed, opacity 0.5 | filled (indigo) | placeholder / not yet wired |

Conventions:
- **Dashed = non-dataflow** (pointer, future-out) or **cycle-closing** (feedback-ack).
- **Thicker (2.5px)** reserved for the feedback-ack so the backpressure loop visually pops.
- **Open arrowhead** distinguishes a *read* (sampling the value, not consuming it) from a *write*/transfer.

## 6. Edge Path Routing

- **All orthogonal (Manhattan).** No diagonals, no curves.
- Short horizontal chain edges use `<line>` with straight `x1→x2` (pipeline row).
- Turning edges use `<path d="M x,y L x,y L x,y ...">` — L-segments only.
- Snake routing (3+ segments) used when an edge must detour around intervening nodes, e.g. `i0-sbd0-old`: `M521,280 L521,235 L213,235 L213,75 L230,75`. Each horizontal read-edge is given its own *vertical lane* (x offsets staggered ~3–4px — 521/533, 551/563) so old/new pairs don't overlap.
- Edges leave the node face perpendicular to it; line endpoints are ~2px clear of the rect to let arrow markers render cleanly.
- Control signals routed through dedicated corridors: sync signals pass along y≈95 (above sbd) and y≈145 (above sd), readGate ack rides y=360 below pipeline.

## 7. Edge Labels

- Class `.edge-label` (12px, `text-anchor: middle`) for descriptors; `.value-label` for value annotations (`0|1`, `old`, `new`).
- Placed ~6px above horizontal edges (label y = edge y − 6) or to the side for verticals.
- **Inline attributes required** on every `<text>`:
  - `font-weight="300"` (slightly heavier than node labels)
  - `fill="#111" stroke="none"` for neutral descriptors, or `fill="<edge color>" stroke="none"` for semantic values (e.g. `#2266aa` for old/new, `#283593` for `0|1`, `#2e7d32` for streak value).
  - `stroke="none"` is **mandatory** — text inherits the parent `<g>`'s stroke otherwise and renders as hollow outlines.
- Feedback-ack label uses `font-weight="600"` + unicode `↻` prefix to visually mark it as the cycle-closer.

## 8. Edge Naming

- camelCase for signal flow: `inputToReadLatch`, `sbd0DoneToSyncGate`, `detectorLatchAckToReadGate`.
- hyphen-segmented for qualified reads: `i0-sbd0-old`, `i0-sbd0-new`.
- IDs of edge groups follow `id="edge-<name>"`; edge name matches the `id` field inside `<metadata>` JSON.
- Channel names encode both endpoints (house rule from [CLAUDE.md](CLAUDE.md)).

## 9. Arrow Markers

All defined in `<defs>`, identical geometry (`M0,0 L8,3 L0,6`, 8×6, refX=8 refY=3) varying only fill color to match edge class:
- `arrow` (#333), `arrow-blue` (#2266aa, unused, legacy), `arrow-indigo` (#283593), `arrow-green` (#2e7d32), `arrow-orange` (#e65100), `arrow-magenta` (#7b1fa2), `arrow-teal` (#00838f).
- `arrow-blue-open` is the exception: **10×8**, fill `none`, stroke `#2266aa` 1.2 — the read-port marker.

## 10. Metadata & Legend Layer

- `<metadata>` right after the opening tag: JSON with `nodes[]` (id, role, optional index), `edges[]` (id, source, target, kind), and optional `timing[]` (step with `t` fraction and `event` string). This is the authoritative spec; the graphics render it.
- `<desc>` after metadata: plain-text role legend, one line per node family — 6–10 lines, the model's first-read summary.
- Visible `<g id="legend">` at the bottom: header row (Color / Description), thin vertical divider at x=210, one row per edge class with a short stroked line sample next to its name. Uses `.legend-bg`, `.legend-heading`, `.legend-name`, `.legend-desc` classes.
- Annotation note box (`.behavior-note-bg` `#fff9c4`, `.behavior-note-text` `#f57f17`, `stroke="#f9a825"`) used for short behavioral call-outs.

## 11. Animation Pattern

- Single SMIL loop, `dur="27s"`, `repeatCount="indefinite"` on every `<animate>`.
- All timings expressed as **fractions of the cycle** via `keyTimes` (`0…1`), matching the fractions in `metadata.timing.steps` — so the spec and animation stay in sync.
- **Node highlight**: a white `<rect>` clone of the node (same x/y/w/h/rx) overlaid with `opacity` keyframes `0;0;0.5;0;0`, flashing on the firing moment.
- **Edge pulse**: a second copy of the edge path (stroke = edge color, width 3, `stroke-dasharray="20,9999"`) with two synchronized animations:
  - `stroke-dashoffset` from `0` to `-<pathLength>` (path length approximated in px)
  - `opacity` `0;0;1;1;0;0` gated to the travel window
- Feedback-ack gets **two** pulse copies — one `arriving` at readGate at the start of the cycle, one `departing` from detectorLatch near the end — showing it as the wrap-around.
- A small `<circle>` flash at the ack's origin (`cx,cy` at detectorLatch's edge) marks the emission moment.
- Animation block is **after** all static geometry, fenced by a big `<!-- ANIMATION -->` banner. Static and dynamic are never interleaved.

## 12. Coordinate & Attribute Discipline

- Integer coordinates throughout; sub-pixel values appear only in computed path lengths inside `keyTimes`.
- Attributes omitted when they match SVG defaults (no redundant `fill="none"` when class already declares it).
- Every structural `<g>` carries `data-role` (and `data-index` for numbered instances) — enables automated scraping/verification.

## 13. Things I Noticed That Weren't in the Prompt

1. **Two-beat read pairing.** Each inhibitor-to-detector edge is doubled (`old` + `new`) and animated on staggered fractions (0.40→0.52 for both, but visually separated by ~12px lane offsets). This encodes that detectors sample two successive values, not one.
2. **Sync-signal lanes.** `sbd0Done` rides y=95, `sd0Done` rides y=145 — dedicated horizontal corridors above each detector so signal paths never cross their source.
3. **Mirror asymmetry.** `sbd0` is red, `sbd1` is blue — same role, different color. Left/right distinction is carried by palette, not just position.
4. **Future-out stub.** `a0` has a faint, dashed, half-opacity exit edge (`.future-out`) pointing to a not-yet-existing downstream node. Pattern: draw placeholder with `opacity: 0.5` + dash to pre-commit to an interface.
5. **Pointer vs. dataflow.** `sd1→i1`, `sd1→sbd1` use `.pointer` (orange dashed) to indicate these are Go struct references captured at construction time, not runtime messages. Useful convention for hybrid dataflow/object diagrams.
6. **Feedback-ack weight asymmetry.** The ack is the only 2.5px line; everything else is 1.5. Intentional — the backpressure cycle is the diagram's headline.
7. **Values on edges are semantic, not ornamental.** `0|1` appears on `.and-out` and `.streak` lines to show the carrier type; `old`/`new` appears on read edges to indicate which of the two latched slots is being sampled.
8. **Node titles are ultra-thin (font-weight 100).** Combined with the muted-pastel fills, this keeps labels legible but visually secondary to the topology — the graph is the primary artifact.

## 14. Verification

This is a read-only compilation — no code changes. To verify:
- Open [diagrams/topology-chain-cascade.svg](diagrams/topology-chain-cascade.svg) in VS Code preview; confirm every class/color/shape in the tables above appears as described.
- Cross-check the `<metadata>` JSON's `nodes[]` and `edges[]` against the `<g>` ids in the body; each entry should correspond to exactly one rendered group.
- Confirm timing fractions in `metadata.timing.steps` line up with `keyTimes` values in the `<animate>` elements.
