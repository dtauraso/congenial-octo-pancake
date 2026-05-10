# Handoff — Step-function substrate spike (diagnosis)

**State:** `task/node-ticks`, latest commit `2b64352`. Step substrate
exists at `src/substrate/step/`, gated by
`USE_STEP_SUBSTRATE_SHAPE_A = true` in `runtime-wires.ts`. Build + tsc
clean. Spike was tested in the editor on Shape A.

## What was built (already committed)

- `step/node.ts` — `StepNode` interface (id + step()), slot helpers.
- `step/driver.ts` — `setInterval(tick, FRAME_MS)` driver with
  start/stop/step.
- `step/shape-a-setup.ts` — wires Input/ReadGate as StepNodes,
  reuses `createWire`+`buildWires`+node-streams listeners so the
  renderer needs no change.
- `step/runtime.ts` — start/stop/pause/resume around the driver.
- `runtime-wires.ts` — delegates to step path when shape ===
  `"input->readGate"` and the flag is on.
- `runtime-wires-stop.ts` — extracted to keep main file under LOC
  budget.

## Spike result

User-observed in editor: **animation runs as a "long train" of
overlapping/continuous pulses** instead of discrete arcs the way the
await substrate paced them. Step substrate fires Shape A but pulse
spacing is wrong.

## Likely causes (rank by cheapness to test)

1. **`FRAME_MS = 100` too aggressive.** Visual arc duration may be
   longer; Input.step() fires every 100ms whenever wire is idle.
   First test: bump FRAME_MS to 500–1000 and observe.
2. **No tick-level backpressure.** Even with slower FRAME_MS, every
   tick where wire is idle triggers another send. Await path got
   backpressure for free because `await wire.send(v)` blocked the
   input loop until ack. Step model loses this — only the wire's
   idle/in-flight check gates writes.
3. **One-pulse-per-tick semantics not enforced.** May need
   `Input.step()` to refuse to fire twice within N ticks regardless
   of wire state, or move slot-clearing onto a tick boundary
   (consume-at-end-of-tick rather than via async ack).

## Diagnosis options

- **A. Tune FRAME_MS** — quick. Edit
  [src/substrate/step/runtime.ts](../../tools/topology-vscode/src/substrate/step/runtime.ts)
  `FRAME_MS` constant, rebuild, observe. If clean discrete pulses
  appear at some value, document and pick a default.
- **B. Lift backpressure into the slot.** Make Input.step() require
  the slot to have been *empty for one full tick* before writing
  again — i.e., write only on the tick after ack. Adds a small
  state machine to Input; decouples cadence from arc duration.
- **C. Decouple visual cadence from logical cadence.** The step
  substrate is logically tick-driven, but the visual layer runs on
  rAF. The "long train" may be a visualization issue, not a logic
  one. Add a console log per tick + per ack and confirm logical
  ordering before assuming visual is broken.

Start with C — it's diagnostic, not corrective, and tells you
whether the spike's logic is right and only the visual coupling is
wrong, or whether the substrate itself needs a backpressure
mechanism.

## Decision after diagnosis

- Fixable cleanly → port Shape D next session (
  [handoff-shape-d-plan.md](handoff-shape-d-plan.md) for current
  Shape D wiring).
- Requires re-introducing per-node ack state → step model isn't
  meaningfully simpler than await; flip flag to false and reopen
  [handoff-timeout-removal.md](handoff-timeout-removal.md) Step A.
- Visual-only issue → investigate
  [src/webview/rf/AnimatedEdge/_use-pulse-lanes-wire.ts](../../tools/topology-vscode/src/webview/rf/AnimatedEdge/_use-pulse-lanes-wire.ts)
  arc/ack interaction.

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
