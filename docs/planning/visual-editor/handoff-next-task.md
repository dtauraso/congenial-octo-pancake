# Active task — edge pulse motion (MODEL.md amended; awaiting verify)

**Branch:** `task/edge-pulse-motion` (push pending; latest changes
uncommitted at handoff time)
**Status:** code complete, all gates green, awaiting in-editor
verification before merge to `main`.

## What landed since prior handoff

1. **MODEL.md amended (Path A).** Geometry now sets `loaded` traversal
   time (`arcLength / pulseSpeed`); substrate waits for pulse arrival
   before `loaded → taken`. The renderer's pulse-arrival is the one
   permitted renderer→substrate signal. Banned-vocabulary list
   narrowed with explicit carve-outs.
2. **Substrate gate.** `WireEvent` gained `"arrived"`. `Wire` gained
   `arrived` flag, `markArrived()`, `awaitArrived()`. `take()` throws
   if not arrived. `createWire(id, renderArrival)` — default `false`
   auto-marks on `load` (headless tests unchanged); webview path
   passes `true`.
3. **Node loop.** `node-loop-uniform-v2` awaits `awaitArrived` between
   `awaitLoaded` and `take`.
4. **Back-channel.** New `pulse-arrived` webview→host message routes
   through `handle-message.ts → frameRenderer.markArrived → runFrames
   handle → wire.markArrived`.
5. **Renderer.** `PulseInstance.onDone` posts `pulse-arrived`. The
   `empty → null` pulse clear from prior session was removed — no
   longer needed; substrate now structurally prevents preemption.
6. **Pulse speed.** `PULSE_SPEED_PX_PER_MS = 0.08` (slowed from 0.3
   on user feedback).

## Gates (branch tip)

tsc ✓, build ✓, vitest 38 / 193 ✓, vocab gate ✓, LOC ✓.

## Verification path

Load proof-out topology (in08 Input → readGate1 ReadGate on `chainIn`).
Trigger input. Expect:
- Pulse traverses the **entire** edge before the substrate advances.
- Lengthen the edge by moving a node mid-flight — remaining traversal
  re-derives; pulse still reaches the destination.
- Fire input repeatedly — every value visibly traverses; no pulse is
  cut off at ~3/4. Earlier pulses no longer get preempted because the
  substrate cannot enter `loaded` again until the prior pulse arrived.
- Static badge appears on `taken`, clears on ack.

Tune `PULSE_SPEED_PX_PER_MS` if speed reads wrong.

## On success

Merge to `main`, delete the branch (local + remote), pick the next
friction item from `session-log.md`. Cost marker likely warranted
(model amendment + substrate wiring is non-trivial).

## On regression

Log the friction. Likely failure modes:
- `take before pulse arrival` thrown from node loop → webview→host
  channel for `pulse-arrived` not delivering. Check
  `parseWebviewToHost` and the message routing.
- Pulse never fires `onDone` → `PulseInstance` cleanup writing
  `arcTraveledRef` but `remainingMs` doesn't tick — check
  `_pulse-frame.ts`.
- Headless tests breaking → `renderArrival` default flipped somewhere.

## Dormant

Shape D port; tick-batching audit superseded; restart-Input friction.

## ALWAYS clause

At end of session, overwrite this file (and the sibling `handoff-*.md`
files) with a freshly-rendered prompt tailored to the state you're
leaving the branch in, and commit on the active branch. Do not rely on
chat history; the next AI may be a fresh model with no transcript. The
rendered handoff must itself contain this same ALWAYS clause so the
loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md) as
the structural source of truth; update the template when an invariant
changes. Keep each file ≤100 LOC per the budget rule.
