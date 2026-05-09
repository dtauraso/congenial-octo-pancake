# Handoff — Next task (START HERE)

**State:** `task/node-ticks` carries the first manual-ack
visualization. The in0→readGate (chainIn) wire is no longer paced by
the visual layer's arc-completion auto-ack; a "⏏ clear slot" button in
the editor toolbar calls `ackWire` on it instead. Other wires (e.g.
i1→readGate.ack) keep their existing visual pacing — the change is
scoped to the one link.

This was driven by a model the user wrote out in plain terms:
**bidirectional comms between A and B; if B says it has room A sends a
pulse, otherwise A holds.** The button is B's room-signal.

## What's done

- Visuals 1–4 on the wires runtime (flash, glow, held, buffered).
- Pause = mid-arc freeze; concurrent clocks frozen on command.
- Wire ready/value back-channel API (sender + receiver).
- `inputLoop`, `andGateLoop`, `joinLoop` substrate primitives.
- `matchSubstrate` shapes A (Input→ReadGate) and B (Input +
  ChainInhibitor → ReadGate) wired through `runtime-wires-shapes.ts`.
- **Manual-ack** (this session): `setupInputReadGate{,Inhibitor}`
  return `manualAckEdgeId`; `runtime-wires.ts` exposes
  `getManualAckEdgeId` + `clearManualAckSlot`; `usePulseLanesWire`
  skips the auto-ack for that one wire id; `ClearSlotButton`
  subscribes to `onArrive` / `onAck` and portals next to RunButton.
- 251/251 vitest; tsc + build clean.

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

A natural follow-up to the manual-ack work is to extend the same
button-driven model to the i1→readGate.ack edge once that edge gains
a real upstream — i.e. once the ChainInhibitor inbound port lands.

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
