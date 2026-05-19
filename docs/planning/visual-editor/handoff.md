# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-18, inert-node indicator landed)

**Active branch:** `main`. Latest commit `fc0fe4e` merges
`task/inert-node-indicator` via `--no-ff`; branch deleted locally
and on remote.

## What landed on main this session

- `fc0fe4e` (merge of `7c139f6`) — Visual "inert" indicator on
  nodes whose required output wire is unconnected. `REQUIRED_OUT_WIRES`
  map + `isKindInert()` helper in `node-kinds.tsx`; `RSubstrateNode`
  applies `r-substrate-node--inert` class (opacity 0.5 + dashed
  outline). Marked kinds: `input`, `relay`, `chaininhibitor`, `join`,
  `readgate`, `register`. `inhibitrightgate` intentionally excluded —
  it fires without an out wire.
- `8b22ddc` — `scripts/force-delegate-hook.py` now exempts subagent
  sessions (detected via `parent_tool_use_id` on the hook payload).
  Prior behavior was blocking executor work inside the delegate
  itself, defeating the point.
- `b464486` — Wire-grab feature confirmed working; retired from
  parked list.
- `d649f12` — ChainInhibitor fan-out back-pressure parked item
  retired. Upstream channel already retries-until-accepted, so the
  `canAccept` guards in `ChainInhibitorBody` (node-kinds.tsx:225-226)
  stay but the framing of "unsolved fan-out" was wrong.

## Next action

None queued. Drive the editor and let friction pick the next task.
Carried-forward friction signals:

- **Process hygiene.** Start each new task by checking out a fresh
  `task/...` branch off `main`, not by committing on whichever
  branch HEAD happens to be on.
- **Schema-parser-parity reminder.** When adding a route/spec
  variant, update `Wire.tsx`, the parser, the type, and the legacy
  migrator in the same commit. See `feedback_schema_parser_parity`.
- **Subagent staging hygiene.** Spot-check `git status` after a
  subagent commit; verify `git show <sha> --stat` against the
  agent's reported "files touched" to catch unstaged-fixup bugs.

## Parked (not open; revisit when friction returns)

- **Marker overshoot/undershoot tuning** beyond -1px. Settled on
  -1px; the lever is `refX` in `MarkerDefs.tsx`.
- **Grow port on zero-input nodes** (decided 2026-05-18 not to do).
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
  the *final segment* of the route.
- NodePalette folds/unfolds with a sideways button; zoom controls
  at bottom-left clear the play/pause button; palette list scrolls
  internally without overlapping controls.
- Wire-grab feature working.
- Nodes with a missing required output wire render with an inert
  indicator (opacity 0.5 + dashed outline).
- No comparison toolbar, no MiniMap, no LegendPanel, no ViewsPanel.
- `tsc --noEmit` clean; `npm run build` clean; `check:loc` clean;
  `check-substrate-vocab` clean.

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
