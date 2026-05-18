# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-18, all task branches merged to main)

**Active branch:** `main`. No task branches outstanding —
`task/topology-driven-edge-shape`, `task/grow-port-on-drop`, and
`task/editor-friction-pass-4` were all merged via `--no-ff` and the
branches deleted locally and on remote. Working tree has unstaged
edits in `memory/MEMORY.md`, `topology.json`, `topology.view.json`
— user's in-editor state plus memory-index pruning. Leave on `main`
or stash before starting a new task branch.

## What landed on main this session

Merge commits: `fd2cddf` (topology-driven-edge-shape), `0dbb038`
(grow-port-on-drop), `78bc916` (editor-friction-pass-4).

topology-driven-edge-shape — five commits, in order:

- `da0d047` **feat:** `pickShape(sx,sy,sp,tx,ty,tp): EdgeRoute` in
  `substrate-r/Wire.tsx`. Picks "line" vs "snake" from handle sides
  + dx/dy. Perpendicular handle pair → "line" (bezier curves into a
  natural L). Parallel-opposing with target ahead + small cross-axis
  offset → "line". Otherwise → "snake". Wired in `RSubstrateEdge.tsx`
  as the default when `data?.route` is unset; explicit author choice
  still wins.

- `f5aba49` **fix:** same-side-bottom handle pair → "below" corridor.
  Caught when i1.out (side=bottom) → readGate1.chainIn2 (side=bottom)
  produced a wide bezier dip. Both bezier control points sat below
  the endpoints, dragging the wire far down. "Below" routes cleanly
  under both nodes instead.

- `8406ec1` **feat:** draggable midpoint handle on "snake" and
  "below" edges, writing to `data.lane`. New files:
  `LaneDragHandle.tsx`, `edge-actions-ctx.ts`. New action
  `setEdgeLane` in `rf/app/_use-edge-handlers.ts` follows the
  existing `mutateSpec` → `specToFlow` → `scheduleSave` pattern
  (`lane` is a top-level spec edge field, not inside `data`).
  Provider wraps in `rf/app.tsx`. Drag axis matches the lane
  semantic: horizontal for snake, vertical for below.

- `40b319f` **fix:** circle needed `pointerEvents:"all"`. React Flow's
  edge SVG layer is `pointer-events:none` by default, so custom
  children get no mouse events without an opt-in.

- `8eac594` **feat:** handle reveals on hover within 16px of the
  wire, stays visible while dragging. Implemented via an invisible
  16px-stroke path along `pathD` as the hit area inside a
  hover-tracking `<g>`.

User confirmed dragging works and saves round-trip.

## Next action

None queued. Drive the editor and let friction pick the next task.
Carried-forward friction signals worth watching:

- **Inert nodes by construction.** A `ReadGate` with no outgoing
  `out` edge bails on `!wire` and silently no-ops — no visual signal
  that it's dead. Candidate fix per
  `feedback_enforce_required_inputs`: model-enforced required
  output, or a visual "inert" indicator.
- **Process hygiene.** Start each new task by checking out a fresh
  `task/...` branch off `main`, not by committing on whichever
  branch HEAD happens to be on.
- **Two pre-existing TS diagnostics in `Wire.tsx`** (`getPhaseKind`
  ~L228 unused, `value` ~L342 unused) — worth a small cleanup
  commit if the next session has slack.

## Parked (not open; revisit when friction returns)

- **Grow port on zero-input nodes** (decided 2026-05-18 not to do).
  `Generic`/`Input` can't grow today; user accepted this.
- **Wire-grab feature** (discussed 2026-05-18). A wire whose path
  animates with the pulse, plus a node that "grabs" the wire and
  hands the endpoint off — runtime topology mutation. Visual-only
  half is ~1 day; handoff half needs a substrate-model answer first
  (what "held" means locally, what triggers grab/release, whether
  dangling endpoints are legal). Cheapest discovery move: build the
  visual-only animation, author a held wire by hand in
  `topology.json`, use the breakage list as the design spec.
- **Fan-out back-pressure on ChainInhibitor** still unsolved. Naive
  `wire.canAccept && inhibitWire.canAccept` gate broke animation
  both times tried. Trace deadlock if retried.
- **Pacing-by-pixel-length / wire-length-dependent firing** — item 9
  in [recommendations.md](recommendations.md). 2026-05-17 audit
  found no active firing-rule divergence; two artifacts noted (dead
  `fanout-convergence.ts` reads `wire.phase`; ChainInhibitor's
  two-load pattern can lose the `inhibitOut` token, masked today by
  wire lengths making both wires accept on the same frame). Do NOT
  reach for a clock primitive, barrier, or sequence-tagged values;
  MODEL.md has no logical-tick view.
- **Obstacle-aware edge routing.** `pickShape` only knows handle
  sides and endpoint coordinates; it doesn't check whether the
  chosen route crosses other node bodies. If that becomes friction,
  thread `useStore((s) => s.nodes)` into the picker and add a
  bbox-intersection check.

## What's actually working

- End-to-end ring animation with real input values flowing through.
- ReadGate pass-through emits `slots[0]`'s consumed value.
- Edge seed delivers once to dest slot at wire mount.
- Drag-to-move ports: 12 snap positions, swap on collision, edges
  follow via `updateNodeInternals`.
- Wire drop onto a saturated node grows a new input port at the
  nearest free snap position; round-trips through save/reload.
- Edge routes pick themselves from topology (handle sides + dx/dy);
  same-side-bottom pairs use the "below" corridor.
- Lane handle reveals on hover within 16px, drag adjusts `lane`
  live along the route's lane axis, mouse-up persists via
  `scheduleSave`.
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
current run). Cleared at start of this session.

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
