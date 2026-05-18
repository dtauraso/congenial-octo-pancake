# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-18, kind-default port-drag persistence fixed)

**Active branch:** `task/editor-friction-pass-3`, ten commits ahead
of `main`. Working tree clean.

## What landed on this branch (since last handoff)

- `58a6035` **feat(visual-editor):** drag-to-move port positions with
  3-slot snap. Connected ports (port already has an edge attached):
  click-hold-drag moves the port; on release, snaps to nearest of 12
  rim positions (3 per side at 25/50/75%); swap if occupied.
  Unconnected ports retain RF wire-creation drag. Persistence via
  `mutateSpec` + `scheduleSave`; PortDef extended with `slot?: 0|1|2`.
  Handle rendering extracted into new `rf/PortRim.tsx` (concept:
  editor UX); `substrate-r/RSubstrateNode.tsx` shrank to a thin call.
  Pure snap math in `rf/port-rim-drag.ts`.
- `8cbcc68` **fix:** drop wrapper `<div>` around each Handle (collapsed
  to (0,0) with no inset, stacking all ports at the corner).
- `2e09255` **fix:** refresh RF node data after port-move via
  `useReactFlow().setNodes`; `mutateSpec` alone doesn't re-derive flow.
- `192343f` **chore:** normalize `topology.json` to JSON.stringify
  (null,2) so future saves are no-op diffs.
- `5961389` **fix(schema):** accept `top|bottom` side and `slot 0|1|2`
  in `parse-nodes-edges.ts`. Without this, first save of a moved port
  produced an unparseable spec → editor loaded blank.
- `a853b60` **memory:** add `feedback_schema_parser_parity` —
  extending a spec type requires updating the runtime validator in the
  same commit.
- `ef1fa96` **fix:** call `useUpdateNodeInternals(nodeId)` after a
  port move so RF re-measures handle positions; otherwise edges stay
  anchored to the old port spot.
- `455170e` **chore:** capture test state in topology.json /
  topology.view.json (readGate ports rearranged, i1 nudged).
- `2f7d6ab` **chore:** remove unconnected `inhibitRight0.out` port
  (override `outputs: []`).
- `54919ea` **fix(substrate-r):** tolerate missing `outWireRef` in
  InhibitRightGate. Body referenced `outWireRef.current` unconditionally;
  when the spec omits the `out` port, renderKindBody passes undefined
  and the body threw every RAF tick, leaving input slots filled and
  upstream wires stuck in deliver-retry. Mark prop optional and guard
  the deref. Firing gate (`&& wire`) already suppresses emission when
  no wire is connected.
- `f74eac1` **chore(hooks):** remove `substrate-r-model-derive`
  PreToolUse hook. It blocked trivial defensive edits as often as it
  caught model drift; can't distinguish a typo fix from a structural
  change. Model alignment is a review concern, not a hook concern.
- `7cc8fad` **fix(visual-editor):** materialize kind-default ports
  before port-drag spec mutation. Ports inherited from `NODE_TYPES`
  defaults (e.g. `inhibitRight0`'s `left`/`right`) were absent from
  `sn.inputs`/`sn.outputs`, so the drop handler's `find()` returned
  undefined and the spec write silently no-op'd. `rf.setNodes` made
  it look like the move stuck until refresh. Fix: on first drag,
  `structuredClone` the kind defaults onto the node spec; subsequent
  side/slot writes persist.

## Next action

None queued. Port-drag now persists across refreshes for all nodes,
including those using kind-default ports. Drive the editor and let
friction pick the next task.

## Parked (not open; revisit when friction returns)

- **Fan-out back-pressure on ChainInhibitor** still unsolved. Naive
  `wire.canAccept && inhibitWire.canAccept` gate broke animation both
  times it was tried. Trace deadlock if retried.
- **Pacing-by-pixel-length / wire-length-dependent firing** — item 9
  in [recommendations.md](recommendations.md). Audit (2026-05-17)
  found no active firing-rule divergence: all node predicates are
  slot-phase-only. Two artifacts noted: dead file `fanout-convergence.ts`
  reads `wire.phase` (prohibited pattern, but unused); ChainInhibitor's
  two-load pattern can lose the inhibitOut token if that wire is
  in-flight, masked today by wire lengths making both wires accept on
  the same frame. Do NOT reach for a clock primitive, barrier, or
  sequence-tagged values; MODEL.md has no logical-tick view.

## What's actually working

- End-to-end ring animation with real input values flowing through.
- ReadGate pass-through emits `slots[0]`'s consumed value.
- Edge seed delivers once to dest slot at wire mount.
- Drag-to-move ports: 12 snap positions, swap on collision, edges
  follow via `updateNodeInternals`.
- `tsc --noEmit` clean; `npm run build` clean.
- 4 Playwright scenario tests all pass (`npm run test:e2e`).
- `check-substrate-vocab.mjs` clean.

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
current run). The log is currently >500 MB — worth clearing when
convenient.

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
