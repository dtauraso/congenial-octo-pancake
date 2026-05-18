# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-17, end of session)

**Active branch:** `task/editor-friction-pass`, at `f8af21a`, not yet
pushed. Working tree has uncommitted TEMP probes in
`RSubstrateEdge.tsx` and `registry.tsx` (left intentionally for the
run-start follow-up to reuse) and camera-drift in `topology.view.json`
(ignore). Branch is friction-driven per CLAUDE.md post-v0 posture.

**Prior handoff's open issue #0 ("seed not delivering") was stale.**
Investigation this session confirmed seed IS delivered correctly to
the dest slot via `Wire.tsx:424-433`. The real problem the user was
seeing — "i1 looks like it's waiting on i0 to send its first pulse" —
is that seed bypasses the wire animation entirely (`dest.fill` at
mount rather than a source-side `wire.load`), so visually nothing
leaves i1 at tick 0. This is now reframed as a substrate-concept gap
(see new issue #0 below).

## What landed this session

- `f8af21a` **feat(chain-inhibitor): display held value as in-box
  label** — i0/i1 now show `held=<value>` below the title, matching
  the chain-cascade reference SVG. Mirrors `heldRef` into `useState`
  so the label re-renders on each fire. Caveat for verification:
  the label uses `position: absolute` without an explicit
  `position: relative` parent — visually verify placement in the
  live editor; if it floats, wrap or thread a `subLabel` prop into
  `<Node>`.

Investigation only (no code): traced the seed delivery and the
i1-silent-at-tick-0 symptom; concluded the right fix is a substrate-
level run-start signal, not a local seed-path patch. Wrote up
[project_runstart_concept_needed.md](../../../memory/project_runstart_concept_needed.md).

## Open issues (in priority order)

0. **Introduce a shared tick-0 / run-start signal in substrate-r.**
   Today seed is delivered by `Wire.tsx` calling `dest.fill` at
   mount (bypassing `wire.load` and the animation), and InputBody
   self-starts its own RAF loop in a mount `useEffect`. Two local
   mount hacks instead of one substrate concept. Consequence:
   visually i1 looks silent at tick 0 (no source-side launch), and
   "what happens at tick 0" requires reading three files to
   reconcile. The ring animates today only because mount-time
   seed prefill + ReadGate's all-filled gate accidentally pair
   seed with in0[0]'s late arrival. **Investigated and confirmed
   stale: prior handoff issue #0 ("seed not delivering") was
   wrong** — seed delivers correctly to the dest slot via
   `Wire.tsx:424-433`; the real problem is that it skips the wire.
   Fix shape: add a run-start signal (observable along PauseAxis
   lines, or an explicit Start node); seed becomes
   `wire.load(seed)` on run-start; InputBody first emit subscribes
   to run-start. Then tick-0 coincidence is structural, not lucky.
   See [project_runstart_concept_needed.md](../../../memory/project_runstart_concept_needed.md).

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
