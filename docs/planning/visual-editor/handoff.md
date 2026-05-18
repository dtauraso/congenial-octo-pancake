# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-18, snake-v merged to main)

**Active branch:** `main`. `task/snake-v-route` merged via `--no-ff`
and deleted locally and on remote. Working tree clean.

## What landed on main this session

Merge commit on `main` brings four commits from `task/snake-v-route`:

- `03ede91` **feat(wire):** add `snake-v` edge route — a V–H–V dogleg
  (vertical exit → horizontal corridor through `midY` → vertical
  entry). Mirrors the existing H–V–H `snake` across x=y, for
  horizontal-side (left/right) handle pairs. Touches `Wire.tsx`
  (`EdgeRoute` type, `pickShape`, `snakeVD`, `buildEdgePathD`,
  `edgeMidpoint`), `RSubstrateEdge.tsx` (`showHandle` guard),
  `LaneDragHandle.tsx` (existing `ns-resize`/y-delta branch covers
  snake-v).
- `22d8fa0` **feat(view):** explicit `route: "snake-v"` override on
  edge `i1.inhibitOut->inhibitRight0.right` in `topology.view.json`.
- `97e5279` **fix(schema):** accept `snake-v` in the viewerState
  parser, `EdgeView` type, and legacy-field migrator. Without this,
  `route: "snake-v"` survives in memory but is dropped on save→reload.
  (Schema-parser-parity rule: when adding a route variant, update all
  three call sites in the same commit.)
- `e9a0ba7` **docs(claude):** add the "~15-line tight delegate-prompt"
  rule to `CLAUDE.md` (Model routing section) and `memory/`.

Topology side: the two top↔bottom inhibitor edges (`i0.inhibitOut→
inhibitRight0.left` and `i1.inhibitOut→inhibitRight0.right`) now use
the snake-v override and render V–H–V, rotated across x=y / y=-x from
the previous H–V–H. User confirmed working.

## Next action

None queued. Drive the editor and let friction pick the next task.
Carried-forward friction signals:

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
- **Schema-parser-parity reminder.** Today's session caught a
  near-miss: the `snake-v` route was added to `Wire.tsx` first; the
  override appeared to work in memory but would have been silently
  dropped on save→reload until the parser/type/migrator triple was
  patched. The feedback memory `feedback_schema_parser_parity`
  covers this — re-read it before adding any route/spec variant.

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
- **Auto-pick for snake-v.** `pickShape` returns `snake-v` for
  horizontal-side pairs, but vertical-side pairs in the "snake"
  branch don't have an auto-pick rule to choose snake-v based on
  geometry (e.g. when a V–H–V detour would be cleaner than H–V–H).
  Today both call sites set the override by hand. Promote to
  geometry-driven auto-pick if a third hand-overridden case appears.

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
  pairs that need a detour use the V–H–V `snake-v` corridor.
- Lane handle reveals on hover within 16px, drag adjusts `lane`
  live along the route's lane axis, mouse-up persists via
  `scheduleSave`.
- Edge-route overrides (`route: "snake-v"` etc.) round-trip through
  save/reload via `topology.view.json` edges block.
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
