# Handoff — Step-function substrate spike (chosen direction)

**State:** `task/node-ticks`, latest code commit `2b64352`. Step
substrate exists at `src/substrate/step/`, gated by
`USE_STEP_SUBSTRATE_SHAPE_A = true` in `runtime-wires.ts`. Build + tsc
clean. Spike was tested in the editor on Shape A.

## Spike result

User-observed in editor: **animation runs as a "long train" of
overlapping/continuous pulses** instead of discrete arcs.

## Diagnosis (concluded this session — no code changes)

The "long train" is **not** a bug in the step substrate. It exposes a
property that was hidden under the await substrate: pacing was never
encoded in nodes. Under await, `await wire.send(v)` blocked the Input
loop until ack — that blocking *was* the pacing, inherited from the
substrate, not declared by the node. Swap the substrate, and Input has
no local rule about how often to fire, so it fires every round.

Implication: each node must carry its own rule over its own slots +
its own remembered state. **No reference to ticks, time, or clocks
inside the node.** Tick-denominated rules (e.g. `cooldownTicks`)
re-introduce substrate coupling and are rejected.

## Chosen rule for `in0` (Input)

Minimal, local, clock-free:

  - Node remembers `prevSlotEmpty` from the end of last `step()`.
  - This `step()`: if `prevSlotEmpty && slot.empty`, emit. Else no-op.
  - Update `prevSlotEmpty` for next invocation.

No counter, no tick number, no `cooldownTicks` field. If a richer
cadence is wanted later, express it as a state machine over
slot-events (e.g. "two consecutive empty observations"), not over
ticks. The substrate's job is "you get to run now"; the node's job is
"given what I see and what I remember, here's what I do."

## Substrate, as committed

`src/substrate/step/driver.ts`: `setInterval(tick, FRAME_MS)`,
`tick()` iterates `nodes[]` in array order, calls `step()` on each
once. No queue, no readiness check, no priority. Array order is part
of the topology's behavior (writer-before-reader → same-tick
delivery; reverse → one-tick delay).

`setInterval` was spike-grade. Alternatives (`requestAnimationFrame`,
`setTimeout`-chained) are irrelevant until the logic-level rule above
lands. Don't tune FRAME_MS to fix the long train — fix the rule.

## Medium vs. substance (CLAUDE.md updated)

The "ask what industry converged on" rule now applies **only to the
medium** (libraries, bundlers, runtimes, editors). It is **explicitly
excluded** from substance decisions (execution model, node semantics,
substrate, what a wire is). The await/Promise substrate was the
cautionary example: industry-correct for the medium, wrong for the
substance.

## Next move

Implement the per-node rule on Input for Shape A. Single-file change
to whatever Input step-node lives in under `src/substrate/step/`.
Add `prevSlotEmpty` state, gate emit on it, update at end of step().
Rebuild, observe in editor — expect discrete arcs at FRAME_MS cadence
(one pulse per two ticks minimum). If clean, port the same pattern to
the next node along the chain. If still trained, the rule is wrong,
not the FRAME_MS.

## Decision after the rule lands

- Discrete arcs → port Shape D next session
  ([handoff-shape-d-plan.md](handoff-shape-d-plan.md)).
- Still trained → re-examine; do not reach for FRAME_MS or counters.
- Visual-only artifact → investigate
  [src/webview/rf/AnimatedEdge/_use-pulse-lanes-wire.ts](../../tools/topology-vscode/src/webview/rf/AnimatedEdge/_use-pulse-lanes-wire.ts).

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
