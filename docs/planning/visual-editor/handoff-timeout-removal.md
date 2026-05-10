# Handoff — Timeout removal (next task)

**State:** `task/node-ticks`, latest commit `f680b02` (uniform-node
step 2). Suite green at 265/265 but **takes minutes to run**. User
target: **vitest suite ≤30s**.

This task supersedes uniform-node step 3 as the next move. The
uniform-node plan ([handoff-uniform-node-plan.md](handoff-uniform-node-plan.md))
stays open and resumes after this audit lands.

## The finding

The substrate uses real `setTimeout` in three places. Only one of the
three is load-bearing for the dataflow itself, and the user's claim is
that *none* of them need to be:

1. **Cycle yield — [node-loop-cycle.ts:96](../../../tools/topology-vscode/src/substrate/node-loop-cycle.ts#L96)
   and `andGateLoopFanOut`'s per-round `setTimeout(0)`.** Exists only
   to keep the host responsive when a self-pumping cycle (Shape D)
   would spin in microtask space. Dataflow-wise, every loop already
   parks on a real promise (gate, inbound value, ack). Starvation
   only happens if a round can advance *without* awaiting another
   loop's output — which is the bug the latch+AND backpressure
   pattern is meant to prevent. Today's `setTimeout(0)` papers over
   that instead of proving the invariant.

2. **Pulse `setTimeout(durationMs)` —
   [pulse-completion.ts:53](../../../tools/topology-vscode/src/sim/runner/pulse-completion.ts#L53).**
   Visual arc duration. Renderer concern, not substrate. Dataflow
   "pulse done" is just an ack on a channel.

3. **Playback `setInterval` + cycle-restart `setTimeout` —
   [playback.ts:13](../../../tools/topology-vscode/src/sim/runner/playback.ts#L13),
   [cycle-restart.ts:29](../../../tools/topology-vscode/src/sim/runner/cycle-restart.ts#L29).**
   UI-layer pacing. Doesn't belong in substrate.

Tests inherited the same pattern: every contract test defines
`const tick = () => new Promise(r => setTimeout(r, 0))` and polls.
Node clamps `setTimeout(0)` to ~1ms; 265 tests × dozens of ticks each
→ minutes wall-clock.

## The plan (one step per session)

**Step A — audit (do this first, no code changes).** For every loop
in `src/substrate/`, prove its round either (i) awaits an external
ack/gate/inbound promise that only resolves when *another* loop
sends, or (ii) is a confirmed self-cycle that needs an explicit
yield. Document findings in a new `handoff-timeout-audit.md`.
Expectation: every loop is (i); the `setTimeout(0)`s are removable.
If any loop is (ii), name it and explain why the latch+AND
backpressure didn't catch it.

**Step B — delete substrate `setTimeout(0)`s.** Remove from
`node-loop-cycle.ts:96` and `andGateLoopFanOut`. Run the suite. If
Shape D cycle hangs or tests OOM, audit was wrong — revert and fix
the audit, don't re-add the timeout.

**Step C — replace test `tick()` polling with completion-promise
awaits.** Each contract test should `await` a promise that resolves
when the substrate reaches the target state, not poll macrotasks.
Likely needs a small test helper: `awaitState(node, predicate)` that
hooks `onTick` or a state observable.

**Step D — move pulse/playback timing out of substrate.** Pulse
duration → renderer; playback tick → runner UI layer. Substrate
exposes synchronous "advance one round" for tests.

**Step E — measure.** Suite must be ≤30s. If not, find the next
offender (likely the few tests that exercise the runner end-to-end)
and either fake-timer them or shrink durations.

## Read before touching

- [handoff-cycle2-diagnosis.md](handoff-cycle2-diagnosis.md) — why
  feedback edges must be consume-on-read (the invariant Step A is
  verifying still holds).
- [handoff-next-task.md](handoff-next-task.md) — current Shape D
  wiring; the `setTimeout(0)` in `andGateLoopFanOut` is called out
  there as load-bearing. Step A's job is to disprove that.
- [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md).

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
