# Handoff — Next task (START HERE)

**State:** `task/node-ticks` carries manual-ack on **both** readGate
slots. Two per-edge buttons (`⏏ in0→readGate`, `⏏ i1→readGate`) and a
combined `⏏ both` button portal next to RunButton. Other wires keep
visual pacing. Contract tests for the back-channel-era fixes
(inputLoop awaitReady gating + manual-ack runtime API) landed in
`2f48ea9`; suite is 258/258.

Driven by the user's plain-terms model: **bidirectional comms between
A and B; if B says it has room A sends a pulse, otherwise A holds.**
Each button is B's room-signal for one edge.

**Read [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md)
before changing anything in this area.** It documents the full chain,
the load-bearing assumption ("visual layer is the only auto-acker"),
and the cosmetic title-lie traps for future shapes.

## What's done

- Visuals 1–4 on the wires runtime (flash, glow, held, buffered).
- Pause = mid-arc freeze; concurrent clocks frozen on command.
- Wire ready/value back-channel API (sender + receiver).
- `inputLoop`, `andGateLoop`, `joinLoop` substrate primitives.
- `matchSubstrate` shapes A (Input→ReadGate) and B (Input +
  ChainInhibitor → ReadGate) wired through `runtime-wires-shapes.ts`.
- **Manual-ack, multi-edge**:
  `ShapeSetup.manualAckEdges: { id, label }[]`; runtime exposes
  `getManualAckEdges` / `isManualAckEdge` / `clearManualAckSlot`;
  `usePulseLanesWire` skip uses `isManualAckEdge`; `ClearSlotButton`
  renders one button per edge + "both" when ≥2.
- **Back-channel-era contract tests** (this session, `2f48ea9`):
  `input-loop-await-ready.test.ts` (inputLoop send-gating + awaitGate)
  and `runtime-wires-manual-ack.test.ts` (manualAck registration +
  clearManualAckSlot integration through startWiresRuntime).
- 258/258 vitest; tsc + build clean.

## What the next session should do

The original next-port direction still stands: **give ChainInhibitor a
real inbound** so it stops cycling `[1]` as a clock placeholder. Two
routes:

1. **Input2 → ChainInhibitor → ReadGate.ack** — ChainInhibitor uses
   a one-input node loop (inputLoop shape but reading `awaitValue`
   from inbound).
2. **Promote i1 to a join** — two inbound on ChainInhibitor,
   exercises `andGateLoop` end-to-end.

Either route: widen `matchSubstrate` to a third shape, add a setup fn
in `runtime-wires-shapes.ts`, write a contract test mirroring the
existing inhibitor test (manual ack pacing).

The i1→readGate.ack manual-ack is now wired (this session). The
inhibitor's `inputLoop` parks at `awaitReady` after one send and waits
for its button. When ChainInhibitor gains a real inbound and switches
to `andGateLoop`, manual-ack still applies (keyed on edge id, not loop
type), but the "i1 has a queue of 1s" mental model stops being literal.

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
in a prior session. `topology.json` carries the 3-node fixture used
as the real-world e2e for shape B. `topology.view.json` carries
camera drift; orthogonal — leave or stash.

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
