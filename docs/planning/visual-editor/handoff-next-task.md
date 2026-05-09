# Handoff — Next task (START HERE)

**State:** `task/node-ticks` is on Shape C (Input + i1 + ReadGate + i0,
4 nodes / 3 edges). Shape C wiring stands. Latest commit (`e9e3fef`)
fixes the `andGateLoop` pacing bug uncovered last session and drops
the i1 trigger-gate workaround.

## What was fixed

`andGateLoop` previously acked its inbound wires internally
(`for (const w of inbound) ackWire(w)`), which let upstream `inputLoop`s
resolve their `await out.send(...)` *before* the visual layer / manual
ack completed. Pulses stacked on inbound wires (observed on
i1→readGate.ack last session).

The fix mirrors `joinLoop`: after `out.send`, andGateLoop now awaits
`Promise.all(inbound.map((w) => w.awaitReady()))` before the next
cycle. External ack pacing is now load-bearing for both join shapes.

See
[node-loop.ts:75-88](../../../tools/topology-vscode/src/substrate/node-loop.ts#L75-L88).

## What changed in Shape C

- i1 no longer has a trigger gate. `setupInputReadGateInhibitorWithI0`
  in [runtime-wires-shapes.ts](../../../tools/topology-vscode/src/substrate/runtime-wires-shapes.ts)
  passes only `awaitGate` to i1's `inputLoop`; no `awaitOpen`, no
  `triggerSlots` entry.
- i1's send loop now paces through the manual-ack edge (i1→readGate),
  same as in0→readGate.
- Both manual-ack edges still appear as buttons. There is no longer a
  ▶/■ trigger button.

## Still in tree but unused

- `TriggerGate` module
  ([trigger-gate.ts](../../../tools/topology-vscode/src/substrate/trigger-gate.ts)).
- `inputLoop`'s optional `awaitOpen` parameter.
- `TriggerSlotButton.tsx` and `triggerSlots` plumbing in
  `ShapeSetup`.

No shape registers a trigger slot, so the panel section is empty.
Decision needed: delete or keep as a debug pacer.

## What the next session should do

User's choice — none of these block one another:

1. **Pick i0's outbound.** Cycle close to i1 (recommended — completes
   the loop), branch to a second ReadGate, or feed a Distribute /
   EdgeNode.
2. **Write the Shape C contract test.** Still owed from prior session.
   Should assert no pulse stacking on i1→readGate.ack across at least
   two cycles.
3. **Delete unused trigger-gate code** if the debug-pacer use case
   isn't compelling — keeps the substrate lean.

**Read [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md)
before changing anything in the manual-ack area.** Load-bearing
assumption: external acker (visual layer or manual-ack button) is the
only acker. `joinLoop` and `andGateLoop` both rely on this now.

## What's NOT done (and why it's parked)

- in0's symmetric trigger gate — moot now that andGateLoop is fixed.
- Shape C contract test (see option 2 above).
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
