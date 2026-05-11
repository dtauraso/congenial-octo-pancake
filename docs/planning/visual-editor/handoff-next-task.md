# Active task — edge pulse motion (implementation landed, awaiting verify)

**Branch:** `task/edge-pulse-motion` (pushed; last commit `c33d204`)
**Status:** code complete, gates green, awaiting in-editor verification
before merge to `main`.

## What landed
1. `AnimatedEdge.tsx` mounts a `PulseInstance` on `empty → loaded`,
   reading the value from the frame store. Pulse `key` increments per
   transition so a fresh component animates each load.
2. The static held-value badge renders only when `phase === "taken"`
   AND no active pulse — so the moving pulse during `loaded` hands off
   to a stationary badge on `taken`, which clears on the ack
   (`taken → empty`).
3. Per-edge rAF stays on each `PulseInstance` (seamless-geometry
   property preserved). No global rAF, no `pulse-clock.ts`.
4. Legacy event-driven trigger removed:
   - deleted `src/webview/rf/AnimatedEdge/_use-pulse-lanes-ticked.ts`
   - dropped `subscribe/publishEdgeArrive` from
     `src/substrate/node-streams.ts`
5. New constant `PULSE_SPEED_PX_PER_MS = 0.3` in
   `AnimatedEdge/_constants.ts` (no prior speed default existed).

## Gates (branch tip)
tsc ✓, build ✓, vitest 38 / 193 ✓, vocab gate ✓,
LOC ✓ (`AnimatedEdge.tsx` = 95, under 100 budget).

## Verification path
Load proof-out topology (in08 Input → readGate1 ReadGate on `chainIn`).
Trigger input. Expect: a dot+value-label travels the edge while the
wire is `loaded`; the static midpoint badge appears once the wire
transitions to `taken`; the badge disappears on ack (`taken → empty`).
Tune `PULSE_SPEED_PX_PER_MS` if the speed reads wrong.

## On success
Merge to `main`, delete the branch (local + remote), pick the next
friction item from `session-log.md`.

## On regression
Log the friction. Likely tuning knobs: pulse speed; whether to keep
the pulse mounted into `taken` rather than handing off to the badge;
how to handle a `loaded` value change without an intervening `empty`
(currently we only spawn on entry to `loaded`, so back-to-back
`loaded` with different values would not re-spawn — flag if observed).

## Dormant
Shape D port; tick-batching audit superseded; restart-Input friction
(input cycles once and stops — separate task whenever).

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
