# Handoff — Next task (START HERE)

**State:** `task/node-ticks`, commit `5232b32`. Substrate now owns
ticking end-to-end. Wire pulses render in ticked Shape A. Node color
flashes removed. Build green. Branch is **not** ready to merge yet —
the pulse is still wall-clock-timed (legacy artifact); user wants it
tick-driven before merging.

## Next move

**Make wire pulses tick-driven, not wall-clock-driven.** A pulse
should be a *state* (edge occupancy), not an animation:

1. **Substrate change.** Today `step()` runs Input then ReadGate in
   the same tick — Inbox is empty before the tick ends. Defer
   consumption to the next tick so a value sits on the edge from
   tick N (sent) to tick N+1 (consumed). Inbox becomes the single
   source of truth for "what's on the wire right now."
2. **Pulse rendering.** Replace `usePulseLanesTicked` (which still
   spawns a wall-clock-timed `Pulse` from `publishEdgeArrive`) with
   a hook that reads inbox occupancy directly. Render a static dot
   at the edge midpoint while occupied; gone when empty.
3. **Cosmetic transition only.** If the dot should appear to move
   between ticks, drive it with a CSS `transition` keyed on tick
   number. Real time only enters at the cosmetic layer, never gates
   substrate progress. Click ⏭ before transition completes → dot
   snaps to next state.
4. **Strip timing-coupled code.** Drop `effectiveSpeedPxPerMs`,
   `simStart`, `signalRendererComplete`, per-edge slot ledger from
   the ticked path.

Add a contract test: `tickedInboxLen(edgeId)` is 1 between ticks
(after Input tick, before ReadGate tick).

## What landed this session (commit `5232b32`)

- `ticked/runtime.ts` — `step()` wraps `ctx`, observes per-runner
  activity (any `send` or successful `recv`), publishes `publishTick`
  + `publishEdgeArrive` itself. Runners are pure `run(ctx)`.
- `ticked/shape-a.ts` — no telemetry imports; pure runners.
- `node-streams.ts` — new `subscribeEdgeArrive` /
  `publishEdgeArrive` pubsub.
- `AnimatedEdge.tsx` — picks `usePulseLanesTicked` when
  `isTickedActive()`.
- `_use-pulse-lanes-ticked.ts` — new hook (still wall-clock; this
  is what the next task replaces).
- `AnimatedNode.tsx` — flash + glow refs/divs and tick subscriber
  removed (user explicitly asked for no node color pulsing).
- `test/contracts/ticked-substrate-shape-a.test.ts` — two new
  contract tests: substrate-side per-runner tick events, and
  per-send edge-arrive events.

## Why this matters (failure modes of current state)

- **Flash/pulse desync.** ReadGate already consumed before pulse
  finishes traveling. Same-tick drain hides the problem in Shape A;
  it'll surface immediately in any longer chain.
- **Click-rate vs animation-rate drift.** Nothing throttles ⏭.
  Faster clicks pile pulses while substrate is N ticks ahead.
- **Inbox always empty between ticks** → UI can't read substrate
  state to know what's "in flight."
- **Pulse is a ghost.** Carries send-time value; substrate has
  moved on. Stop/restart leaves orphan pulses.

## Pre-existing red tests (carry over)

- `test/contracts/shape-d-cycle.test.ts` — ackEdge depth race.
- `test/contracts/handle-load-repro.test.ts` — real `topology.json`.

## Working tree at handoff

Unstaged (editor state, not committed): `topology.json`
(`"runtime": "ticked"`), `topology.view.json` (camera drift).

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
