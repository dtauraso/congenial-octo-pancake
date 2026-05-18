# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-17, end of session)

**Active branch:** `task/editor-friction-pass`, at `f273f6a`, pushed.
Working tree has only camera-drift in `topology.view.json` (ignore).
Branch is friction-driven per CLAUDE.md post-v0 posture.

**Animation is working.** The edge-detector ring (in0 → ReadGate →
i0 → i1 → ReadGate, with i0/i1.inhibitOut → InhibitRightGate) now
runs end-to-end. ReadGate emits real input values, the seed on the
i1→chainIn2 edge breaks startup deadlock, and the dot stays on the
wire when nodes are dragged while paused.

## What landed this session

- `9c67d53` (now on main) **fix(wire): re-anchor riding dot on path
  change regardless of pause** — dragging a node while paused no
  longer leaves the in-flight dot stranded in old coords.
- `6a197c2` **refactor(edge): drop mid-wire name labels** —
  EdgeLabels renders only the in-flight value, no `data.label` text.
- `f273f6a` **feat(readgate,wire): pass-through value + edge-seed
  plumbing** —
  - ReadGate fires only on all-filled; emits `slots[0]` (primary
    input value) instead of synthesised 1. Removes the partial-0
    emit branch and its tests.
  - Edge-level `seed` is now threaded from spec → RSubstrateEdge /
    TopologyRoot → Wire and delivered once to the dest slot on
    mount. Required to seed ring feedback edges.

Branch maintenance: deleted `task/drop-output-wake-from-bodies` and
`task/wire-dot-reanchor` after merging; main is at `9c67d53`.

## Open issues (in priority order)

1. **Fan-out back-pressure on ChainInhibitor** is *still* unsolved.
   The naive `wire.canAccept && inhibitWire.canAccept` gate has been
   tried twice this session and both times broke the animation
   (likely deadlock — body refuses to consume, downstream never
   drains). With ReadGate now pass-through and seed in place, the
   contention pattern is different — worth another attempt, but
   trace the deadlock if it recurs (capture `trace.chaininhibitor.skip`
   bursts and follow the cascade).
2. **Pacing-by-pixel-length is still load-bearing for correctness.**
   The fix removed one source of clobber (partial-0) but the model
   incompatibility named in this session — logical-tick view vs
   physical-wire view — still stands. Edge detection only works when
   wire lengths happen to align. The substrate-level shape of the
   real fix (clock primitive? tick-boundary node? sequence numbers
   on values?) is undecided.
3. **Hook regression** (carryover):
   `.claude/hooks/substrate-r-model-derive.sh` is still at `exit 0`;
   should be `exit 2`.
4. **Memory hygiene:** `feedback_run_is_input_only.md` is still pre-
   polling-redesign and stale; should be retired or rewritten.
   `feedback_readgate_partial_0_is_spec.md` and a new
   `feedback_edge_seed_required_for_rings.md` were updated/added
   this session.

## What's actually working

- End-to-end ring animation with real input values flowing through.
- ReadGate pass-through emits `slots[0]`'s consumed value.
- Edge seed delivers once to dest slot at wire mount (substrate-r
  and editor paths both); F1 test now passes.
- Riding dot stays on the wire under paused-drag (Wire.reposition
  + useLayoutEffect on pathD/arcLength).
- Mid-wire name labels removed; in-flight value labels intact.
- `tsc --noEmit` clean; `npm run build` clean.
- 4 pre-existing vitest failures (Node throw, 2-input join silent,
  D3 join partial, wirePhaseReducer load-on-in-flight throw) —
  unchanged this session, predate this branch.

## Substrate model state

The session named the central tension explicitly: two views of the
topology that the substrate is forced to reconcile —

- **Logical view:** values flow per shared tick; the shift-register
  pair (i0/i1) presents `(curr, prev)` as a synchronised pair to
  InhibitRightGate; edges are detected by comparing same-tick values.
- **Physical view:** independent pulses at uniform speed travel along
  wires of different lengths; nodes see arrivals at whatever wall-
  clock moment the wire's length dictates. No shared tick exists.

The topology is correct in the logical view. The substrate runs in
the physical view. They agree only when wire lengths happen to align
— which is why empirical fixes ("shorten this wire") work locally
but don't generalise. Recovery requires introducing something in the
physical layer that carries the shared-tick contract (clock, barrier,
sequence-tagged values, or moving held state into slots so substrate
slot-phase rules govern it). No code change yet; this is the next
design conversation.

## Dev-loop

After any substrate-r edit: `npm run build` (vitest/tsc don't refresh
`out/webview.js`). Live log at `.probe/webview-log.jsonl`; clear with
`: > .probe/webview-log.jsonl` between runs (NOT before reading the
current run — Claude truncated it once by mistake).

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
