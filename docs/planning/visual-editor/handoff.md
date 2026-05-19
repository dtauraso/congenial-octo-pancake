# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-18, force-delegate hook on main)

**Active branch:** `main`. Latest commit `e81bba6` adds a PreToolUse
hook that hard-blocks executor-style work after 2 inline lookups.
Earlier in the session, `task/strip-editor-chrome` merged via
`--no-ff` (commit `4f34395`) and deleted locally and on remote.

## What landed on main this session

- `e81bba6` Added `scripts/force-delegate-hook.py` + wired into
  `.claude/settings.json` PreToolUse. Counts Read/Grep/Glob and
  search-style Bash (grep|rg|find|ls|cat|head|tail|awk|sed) per
  session; 3rd qualifying call returns
  `permissionDecision: "deny"` with a message instructing the model
  to spawn an Agent subagent. Counter resets on Task/Agent. Existing
  soft `UserPromptSubmit` reminder via `delegate-reminder-hook.py`
  is retained. Manual escape: `rm /tmp/claude-delegate-*.count`.

Editor chrome cleanup sweep (earlier this session) — removed
dead/distracting UI panels and tightened the remaining chrome. Net:
-981 lines inserted, +109.

Editor chrome cleanup sweep — removed dead/distracting UI panels and
tightened the remaining chrome. Net: -981 lines inserted, +109.

- `d05d237` Removed ViewsPanel (saved-views panel).

- `07057ff` Removed React Flow MiniMap.
- `1106648` Removed compare-with feature (CompareToolbar,
  diff-decorate/*, compare-load host messages, comparison state,
  isReadOnlyView guards, simplified decorate()).
- `9085d25` Shrunk play/pause panel to button-sized; removed
  placeholder time label.
- `b46ce2f` Removed LegendPanel.
- `02ae033`, `8da7b11` Added sideways fold button to NodePalette
  (left-anchored so position is stable across toggle).
- `7bf416e`, `fe07bff` Moved zoom controls to bottom-left with 56px
  offset to clear play/pause.
- `8db7844`, `3ad8155` Capped palette height so it doesn't overlap
  zoom controls; list scrolls internally.

`tsc --noEmit` clean; `npm run build` clean.

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
- **Schema-parser-parity reminder.** When adding a route/spec
  variant, update `Wire.tsx`, the parser, the type, and the legacy
  migrator in the same commit. See `feedback_schema_parser_parity`.
- **Subagent staging hygiene.** A subagent on this branch left
  required edits unstaged after `git mv` and committed only the
  renames, breaking the pushed commit. The local working tree had
  the fixups so `tsc`/`build` passed inline. Spot-checking
  `git status` after a subagent commit catches this; verifying
  `git show <sha> --stat` against the agent's reported "files
  touched" catches it more reliably.

## Parked (not open; revisit when friction returns)

- **Marker overshoot/undershoot tuning** beyond -1px. This session
  experimented (overshoot 10px, undershoot 5/3/1) and settled on
  -1px. If the visual gap to the handle dot becomes friction again,
  the lever is `refX` in `MarkerDefs.tsx`.
- **Grow port on zero-input nodes** (decided 2026-05-18 not to do).
- **Wire-grab feature.** Visual half ~1 day; handoff half needs a
  substrate-model answer (what "held" means locally).
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
- NodePalette folds/unfolds with a sideways button; zoom controls
  at bottom-left clear the play/pause button; palette list scrolls
  internally without overlapping controls.
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
