# Handoff — Next task (START HERE)

**State:** `task/node-ticks` carries the first multi-input node port:
Input + ChainInhibitor → ReadGate. `joinLoop` (no outbound, ack-paced
by the visual layer) is the new substrate primitive. Pulses fire on
both edges; pacing is one pulse-pair per cycle.

## What's done

- Visuals 1–4 on the wires runtime (flash, glow, held, buffered).
- Pause = mid-arc freeze; concurrent clocks frozen on command.
- Pause-freeze survives PulseInstance remount.
- Wire ready/value back-channel API (sender + receiver).
- `inputLoop` gates on `awaitReady` before send.
- `andGateLoop` primitive for multi-input joins with outbound.
- **`joinLoop` primitive** (this session): same shape, but no outbound
  and no internal ack — awaits all inbound idle after onFire so the
  visual `PulseInstance.onDone → ackWire` paces the cycle. Without
  this discipline, the loop runs as a microtask hot loop and starves
  rAF/setTimeout (canvas blank, train-of-pulses regression). See
  [memory/feedback_substrate_visual_pacer.md](../../../memory/feedback_substrate_visual_pacer.md).
- **`matchSubstrate` widened** to admit 3-node / 2-edge shape:
  Input → ReadGate.chainIn AND ChainInhibitor → ReadGate.ack.
- **runtime-wires dispatch** + new `runtime-wires-shapes.ts` helper
  (LOC budget). ChainInhibitor with no inbound cycles `[1]` as a
  clock-style emitter — placeholder until i1 gains a real input port.
- **Tests:** `runtime-wires-inhibitor.test.ts` drives manual acks;
  `handle-load-repro.test.ts` exercises the full handleLoad pipeline
  on the actual repo `topology.json`. 250/250 green; tsc + build clean.
- **Webview error handlers** (`window.error`,
  `window.unhandledrejection`, `console.error` hijack) kept in
  `src/webview/main.tsx` as cheap insurance — substrate logs land in
  `.probe/substrate-log.jsonl` without DevTools.

## What the next session should do

**Per-edge slot pacing already works** — verified this session by
[join-loop-slot-pacing.test.ts](../../../tools/topology-vscode/test/contracts/join-loop-slot-pacing.test.ts).
Each `Wire` is a per-edge slot with its own ready/ack; a fast
source refills its edge while a slow source is held. No
`slotJoinLoop` was needed. See [handoff-slot-plan.md](handoff-slot-plan.md)
for the full reasoning and the design options (drop drain barrier,
fire-per-arrival) that remain available but unmotivated.

Original next-port direction still stands: **give ChainInhibitor a
real inbound** so it stops cycling `[1]` as a clock placeholder.
Two routes:

1. **Input2 → ChainInhibitor → ReadGate.ack** — ChainInhibitor uses
   a one-input node loop (inputLoop shape but reading `awaitValue`
   from inbound).
2. **Promote i1 to a join** — two inbound on ChainInhibitor,
   exercises `andGateLoop` end-to-end.

Either way: widen `matchSubstrate` to a third shape, add a setup fn
in `runtime-wires-shapes.ts`, write a contract test mirroring the
existing inhibitor test (manual ack pacing).

## What's NOT done (and why it's parked)

- Legacy globals (`sim/runner`, `sim/event-bus`, `legacyRunnerState`,
  `pauseRunner`, `isPlaying`) still imported by AnimatedEdge,
  PulseInstance, TimelinePanel, Bookmarks, RunnerProbe,
  fold-halo-probe, `_handle-load`, `_on-node-drag`. Removing them
  follows the next port — same gating logic as before.
- `node-loop.test.ts` is 228 LOC, pre-existing offender from
  `1a918b1`. Split as a follow-up commit.

## Working tree note

`.claude/settings.json` carries the `Bash(kill *)` permission added
this session. `topology.json` and `topology.view.json` carry the
3-node fixture used as the real-world e2e for shape B.

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
