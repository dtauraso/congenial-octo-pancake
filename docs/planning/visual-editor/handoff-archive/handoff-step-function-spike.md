# Handoff — Step-function substrate spike (chosen direction)

**State:** `task/node-ticks`, latest code commit `2b64352`. Step
substrate exists at `src/substrate/step/`, gated by
`USE_STEP_SUBSTRATE_SHAPE_A = true` in `runtime-wires.ts`. Build + tsc
clean. Spike was tested in the editor on Shape A.

## Spike result

User-observed in editor: **animation runs as a "long train" of
overlapping/continuous pulses** instead of discrete arcs.

**Update (this session):** the per-node `prevSlotEmpty` rule was
implemented on the Input step-node in
[src/substrate/step/shape-a.ts](../../../tools/topology-vscode/src/substrate/step/shape-a.ts).
**Symptom persists** — user reports edges still show long pulse
trains in the editor. The rule as written is short-circuited
(suspected: writer-before-reader array order drains the slot
same-tick, so `prevSlotEmpty` is always true and Input emits every
tick). The spike's central claim is not yet confirmed; either the
rule needs richer state, the array order needs reconsideration, or
the train is a visual-layer artifact. See "Next move" in
[handoff.md](handoff.md) for the diagnostic plan.

## Diagnosis (concluded this session — no code changes)

The "long train" is **not** a bug in the step substrate. Under
await, `await wire.send(v)` blocked Input until ack — that blocking
*was* the pacing, inherited from the substrate. Swap the substrate
and Input has no local rule about how often to fire.

Implication: each node must carry its own rule over its own slots +
its own remembered state. **No reference to ticks, time, or clocks
inside the node.** Tick-denominated rules (e.g. `cooldownTicks`)
re-introduce substrate coupling and are rejected.

## Chosen rule for `in0` (Input)

Minimal, local, clock-free:

  - Node remembers `prevSlotEmpty` from the end of last `step()`.
  - This `step()`: if `prevSlotEmpty && slot.empty`, emit. Else no-op.
  - Update `prevSlotEmpty` for next invocation.

No counter, no tick number, no `cooldownTicks`. Richer cadence, if
needed, must be a state machine over slot-events, not ticks. The
substrate's job is "you get to run now"; the node's job is "given
what I see and what I remember, here's what I do."

## Substrate, as committed

`src/substrate/step/driver.ts`: `setInterval(tick, FRAME_MS)`,
`tick()` iterates `nodes[]` in array order, calls `step()` on each
once. No queue, no readiness check, no priority. Array order is part
of the topology's behavior (writer-before-reader → same-tick
delivery; reverse → one-tick delay).

`setInterval` was spike-grade. Alternatives (`requestAnimationFrame`,
`setTimeout`-chained) are irrelevant until the logic-level rule above
lands. Don't tune FRAME_MS to fix the long train — fix the rule.

## Next move

Diagnose why the rule did not change visible cadence on Shape A.
Do not port Shape D or any further nodes until Shape A reads as
discrete arcs in the editor.

Suggested order (cheap to expensive):

  1. **Instrument first.** Log Input emits and ReadGate consumes
     per tick over a 2-second window. If Input emits every tick,
     the rule is being short-circuited (most likely cause given
     writer-before-reader order: ReadGate drains same-tick, slot
     is empty end-of-step, `prevSlotEmpty` is always true). If
     emits are spaced but the editor still shows a long train,
     it's a visual-layer issue.
  2. **If logic-side:** redesign the rule to survive same-tick
     drain — e.g. add a `justEmitted` flag set on emit, cleared
     only after observing one full empty-without-emit tick.
     Alternatively reconsider driver array order, but note that
     array order = topology behavior per the spike commitment, so
     a flip needs an explicit rationale.
  3. **If visual-side:** investigate
     [_use-pulse-lanes-wire.ts](../../../tools/topology-vscode/src/webview/rf/AnimatedEdge/_use-pulse-lanes-wire.ts).

Hard constraints still hold: no FRAME_MS tuning, no tick counter,
no `cooldownTicks`. Allowed: richer state machines over slot/emit
events.

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
