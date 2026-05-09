# Handoff — Next task (START HERE)

**State:** `task/node-ticks` is on Shape C (Input + i1 + ReadGate + i0,
4 nodes / 3 edges). Shape C wiring stands. Latest commit (`a884cba`)
adds a **per-loop trigger gate** that hand-paces i1's send loop via a
panel button — workaround for a real bug uncovered this session.

## The bug (still open)

`andGateLoop` acks its inbound wires internally
([node-loop.ts:79](../../../tools/topology-vscode/src/substrate/node-loop.ts#L79)):

```ts
for (const w of inbound) ackWire(w);
```

That ack unblocks upstream `inputLoop`s' `await out.send(...)` *before*
the visual arc completes, so pulses stack on the wire even though
both inbound edges (chainIn, ack) are registered as `manualAckEdges`.
Manual-ack registration only suppresses the **visual layer's**
auto-ack — it does not stop the loop from acking itself.

Shape B's `joinLoop` got this right
([node-loop.ts:121](../../../tools/topology-vscode/src/substrate/node-loop.ts#L121)):
it awaits external ack via `awaitReady` after firing. Shape C swapped
to `andGateLoop` for the emit capability and lost that property.

User reported the symptom on i1→readGate.ack: more than one pulse on
the wire at once.

## The workaround in this commit

Per-loop open/closed gate, default closed; click toggles.

- New `TriggerGate` in
  [trigger-gate.ts](../../../tools/topology-vscode/src/substrate/trigger-gate.ts)
  — `isOpen / toggle / awaitOpen / wake / subscribe`.
- `inputLoop` gains optional `awaitOpen` (parks before send when
  closed).
- Shape C registers **one** trigger slot for i1's loop in
  [runtime-wires-shapes.ts](../../../tools/topology-vscode/src/substrate/runtime-wires-shapes.ts).
- Runtime exposes `getTriggerSlots()` and `wake()`s all gates on stop
  so parked loops observe `stopped=true`.
- New panel button in
  [TriggerSlotButton.tsx](../../../tools/topology-vscode/src/webview/panels/TriggerSlotButton.tsx)
  shows ▶ when closed, ■ when open.

**Scope:** only i1 has a trigger gate. in0 still has the same
internal-ack issue on chainIn but is parked per user direction.

## What the next session should do

Two paths, user's choice:

1. **Fix andGateLoop properly.** Mirror joinLoop's post-fire
   `awaitReady` step on each inbound, then drop the i1 trigger gate
   (or keep it as a debug pacer). This is the principled fix.
2. **Pick i0's outbound** (the original next move from the prior
   handoff): cycle close to i1, branch to a second ReadGate, or feed a
   Distribute/EdgeNode. Recommended: cycle close to i1.

Doing (1) before (2) keeps subsequent shapes from inheriting the
pacing bug. A Shape C contract test is also still owed.

**Read [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md)
before changing anything in the manual-ack area.** Load-bearing
assumption: visual layer is the only auto-acker. The andGateLoop bug
violates this; the trigger gate sidesteps it.

## What's NOT done (and why it's parked)

- andGateLoop internal-ack fix (see above).
- in0's symmetric trigger gate (user said i1 only).
- Shape C contract test.
- Legacy globals (`sim/runner`, `legacyRunnerState`, `pauseRunner`,
  `isPlaying`) still imported by AnimatedEdge, PulseInstance, etc.
- Per-edge slot-pacing thread (drop drain barrier, fire-per-arrival)
  remains parked — see [handoff-slot-plan.md](handoff-slot-plan.md).

## Working tree note

`.claude/settings.json` carries the `Bash(kill *)` permission added in
a prior session. `topology.view.json` carries camera drift; orthogonal
— leave or stash.

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
