# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-18, short-edge-small-markers merged to main)

**Active branch:** `main`. `task/short-edge-small-markers` merged via
`--no-ff` and deleted locally and on remote. Working tree clean.

## What landed on main this session

Two task branches merged in sequence; the second (this session)
brings three commits via `task/short-edge-small-markers`:

- `d8e9886` **feat(markers):** auto-shrink arrow marker on short edges
  — adds `sm` marker set (5x4 filled, 6x5 open) to `MarkerDefs.tsx`,
  exports `markerEndUrl(kind, arrowStyle, size?)`, and selects `sm`
  in `RSubstrateEdge.tsx` when the edge is below threshold. Docs
  section 9 updated in `svg-style-guide.md`.
- `d827f36` **feat(markers):** shrink by final-segment length, sm at
  3/4, -1px undershoot. The shrink decision now keys off
  `finalSegmentLength` (the leg the arrow sits on) rather than total
  path length — snake-v with a short vertical entry leg now picks
  `sm` even when total path is long. `sm` boxes scaled to 3/4
  (filled 3.75x3, open 4.5x3.75). All four markers nudged refX -1px
  (md 7/9, sm 4/5) so the tip sits just inside the handle dot.
- `a3e5096` **chore(ci):** drop manual periodic-checks workflow —
  `workflow_dispatch`-only, duplicated locally-run commands, no
  observed use. `.github/` removed entirely (no dependabot either,
  per user choice to rely on UI-toggled Dependabot alerts).

Topology side: `topology.view.json` reflects a new camera/zoom and a
moved `inhibitRight0` position from this session's editor drive.

## Next action

None queued. Drive the editor and let friction pick the next task.
Carried-forward friction signals (unchanged from prior handoff):

- **Inert nodes by construction.** A `ReadGate` with no outgoing
  `out` edge bails on `!wire` and silently no-ops — no visual signal
  that it's dead. Candidate fix per
  `feedback_enforce_required_inputs`: model-enforced required
  output, or a visual "inert" indicator.
- **Process hygiene.** Start each new task by checking out a fresh
  `task/...` branch off `main`, not by committing on whichever
  branch HEAD happens to be on.
- **Two pre-existing TS diagnostics in `Wire.tsx`** (`getPhaseKind`
  unused, `value` unused) — line numbers drift each edit pass. Worth
  a small cleanup commit if the next session has slack.
- **Schema-parser-parity reminder.** When adding a route/spec
  variant, update `Wire.tsx`, the parser, the type, and the legacy
  migrator in the same commit. See `feedback_schema_parser_parity`.

## Parked (not open; revisit when friction returns)

- **Marker overshoot/undershoot tuning** beyond -1px. This session
  experimented (overshoot 10px, undershoot 5/3/1) and settled on
  -1px. If the visual gap to the handle dot becomes friction again,
  the lever is `refX` in `MarkerDefs.tsx`.
- **Grow port on zero-input nodes** (decided 2026-05-18 not to do).
- **Wire-grab feature.** Visual half ~1 day; handoff half needs a
  substrate-model answer (what "held" means locally).
- **Fan-out back-pressure on ChainInhibitor** still unsolved. Naive
  `wire.canAccept && inhibitWire.canAccept` gate broke animation
  both times tried.
- **Pacing-by-pixel-length / wire-length-dependent firing** — item 9
  in `recommendations.md`. Do NOT reach for a clock primitive,
  barrier, or sequence-tagged values; MODEL.md has no logical-tick
  view.
- **Obstacle-aware edge routing.** `pickShape` only knows handle
  sides and endpoint coordinates; no body-intersection check.
- **Auto-pick for snake-v.** Override is set by hand at both call
  sites; promote to geometry-driven auto-pick if a third
  hand-overridden case appears.

## Security / supply-chain posture

Shai-Hulud npm worm check (2026-05-18): clean. None of the indicator
strings, filenames, or affected package names present in the tree;
`package.json` has no lifecycle scripts; `--ignore-scripts` is no
longer enforced in CI (CI removed). Dep surface is narrow (React +
Zustand + Immer + esbuild + Vitest + Playwright); not in the worm's
blast radius. To re-introduce CI later, the audit step should use
`npm ci --ignore-scripts` and `npm audit --audit-level=moderate`.

## What's actually working

- End-to-end ring animation with real input values flowing through.
- ReadGate pass-through emits `slots[0]`'s consumed value.
- Edge seed delivers once to dest slot at wire mount.
- Drag-to-move ports: 12 snap positions, swap on collision, edges
  follow via `updateNodeInternals`.
- Wire drop onto a saturated node grows a new input port at the
  nearest free snap position; round-trips through save/reload.
- Edge routes pick themselves from topology (handle sides + dx/dy);
  same-side-bottom pairs use the "below" corridor; horizontal-side
  pairs that need a detour use the V-H-V `snake-v` corridor.
- Lane handle reveals on hover within 16px, drag adjusts `lane`
  live along the route's lane axis, mouse-up persists via
  `scheduleSave`.
- Edge-route overrides (`route: "snake-v"` etc.) round-trip through
  save/reload via `topology.view.json` edges block.
- Arrow markers auto-shrink (and drop entirely below 5px) based on
  the *final segment* of the route — so short entry legs on long
  doglegs get small arrows.
- `tsc --noEmit` clean except two pre-existing Wire.tsx warnings;
  `npm run build` clean; `check:loc` clean; `check-substrate-vocab`
  clean.

## Substrate model state

MODEL.md (as of 2026-05-17 / `485f041`) has no global round, tick, or
simultaneity layer. Coordination is local via slot phases. Any
reasoning that reaches for a clock primitive, barrier, sequence-tagged
values, or "logical view" is drift — the substrate has one view.
Banned vocabulary includes tick/round/step/cohort/lap; the vocab check
script enforces this in substrate-r/.

## Dev-loop

After any substrate-r edit: `npm run build` (tsc alone doesn't refresh
`out/webview.js`). Live log at `.probe/webview-log.jsonl`; clear with
`: > .probe/webview-log.jsonl` between runs (NOT before reading the
current run).

Cwd for tsc/tests/check-loc/build: `tools/topology-vscode/`.

## ALWAYS clause

At end of session, overwrite this file with a freshly-rendered
prompt tailored to the state you're leaving the branch in, and
commit on the active branch (main if no task is in flight). Do not
rely on chat history; the next AI may be a fresh model with no
transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes.
