# Handoff — Next task (START HERE)

**State:** `task/node-ticks` now matches **Shape C**: Input + i1 +
ReadGate + i0 with edges `in0→readGate.chainIn`, `i1→readGate.ack`,
and `readGate.out→i0.in` (4 nodes / 3 edges). ReadGate switched from
`joinLoop` (ack-only) to `andGateLoop` — it now actually emits the
chainIn value downstream to i0. i0 is a **sink** for now: it consumes
via `readGateLoop(autoAck:false)` so the visual layer paces its ack.
Manual-ack still covers chainIn + ack on readGate; the new
`readGate→i0` wire auto-paces with visuals.

User confirmed conditional timing for all 4 nodes is correct in the
running editor.

**Read [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md)
before changing anything in the manual-ack area.** Load-bearing
assumption: visual layer is the only auto-acker.

## What's done

- Visuals 1–4 on the wires runtime (flash, glow, held, buffered).
- Pause = mid-arc freeze; concurrent clocks frozen on command.
- Wire ready/value back-channel API.
- `inputLoop`, `andGateLoop`, `joinLoop`, `readGateLoop` primitives.
- `matchSubstrate` shapes A, B, **C** wired through
  `runtime-wires-shapes.ts` via `matchSubstrateShape()` dispatch.
- Multi-edge manual-ack with per-edge buttons + "both".
- Back-channel-era contract tests (`2f48ea9`).
- 258/258 vitest; tsc + build clean.

## What the next session should do

Pick i0's role. The user deferred this when wiring Shape C, but with
the sink working it's time to decide:

1. **Cycle close: i0 → i1.in (or back to readGate.ack)** — first real
   feedback loop in the substrate. Pacing implications: i1's
   placeholder `[1]` queue would be replaced by an inbound on i1, so
   i1 switches from `inputLoop` to either `inputLoop`-with-real-source
   or `andGateLoop`. This is the original "give ChainInhibitor a real
   inbound" item carried over from prior handoffs.
2. **i0 → second ReadGate** — branch the chain forward instead of
   looping back. Easier to reason about than a cycle; less interesting
   for the constant-time goals.
3. **i0 emits to a Distribute / EdgeNode** — earliest taste of the
   contrast/edge primitives.

Recommended: **route 1**, since closing the cycle is what the
self-sustaining mode in CLAUDE.md eventually requires, and the
machinery (joinLoop / andGateLoop / manual-ack) is now mature enough
to absorb pacing surprises.

Either way: widen `matchSubstrate` to a fourth shape, add a setup fn,
and write a contract test mirroring `runtime-wires-manual-ack.test.ts`.

A Shape C contract test is also still owed — a small follow-up that
asserts the readGate→i0 wire ticks once per chainIn+ack pair and that
manual-ack edges remain just chainIn+ack.

## What's NOT done (and why it's parked)

- Legacy globals (`sim/runner`, `sim/event-bus`, `legacyRunnerState`,
  `pauseRunner`, `isPlaying`) still imported by AnimatedEdge,
  PulseInstance, TimelinePanel, Bookmarks, RunnerProbe,
  fold-halo-probe, `_handle-load`, `_on-node-drag`. Removing them
  follows the next port — same gating logic as before.
- `node-loop.test.ts` is 228 LOC, pre-existing offender from
  `1a918b1`. Split as a follow-up commit.
- Per-edge slot-pacing thread (drop drain barrier, fire-per-arrival)
  remains parked — see [handoff-slot-plan.md](handoff-slot-plan.md).

## Working tree note

`.claude/settings.json` carries the `Bash(kill *)` permission added
in a prior session. `topology.view.json` carries camera drift;
orthogonal — leave or stash.

## ALWAYS clause

At end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
