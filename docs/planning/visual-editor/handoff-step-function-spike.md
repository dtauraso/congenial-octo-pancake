# Handoff — Step-function substrate spike (next task)

**State:** `task/node-ticks`, latest commit `f680b02` (uniform-node
step 2). Suite green at 265/265 but takes minutes to run.

This task **supersedes** both the timeout-removal plan
(`handoff-timeout-removal.md`, now obsolete) and uniform-node step 3
(`handoff-uniform-node-plan.md`, on hold). If the spike succeeds, both
plans are deleted rather than executed.

## Why

The current TS substrate emulates Go's goroutine+channel concurrency
with `await` on promises. That choice was inherited from the Go side,
where Go was picked because **channels were cheap** — not because the
dataflow needs real OS-thread concurrency. In single-threaded JS the
emulation produces friction:

- Tests poll with `setTimeout(0)`; suite takes minutes.
- Shape D needed a `setTimeout(0)` yield (load-bearing? unclear).
- Whether any loop self-feeds synchronously is not obvious from
  reading the code — would need an audit.
- Latch+AND ack dance exists to enforce ordering that a step-function
  driver gets for free.

User's framing (this session): each node runs a loop looking at
inputs and deciding whether to send an output. Play/pause halts the
loop. **Nothing should be set up to manage concurrent processes.**
Nodes all tick on the same beat; their internal state (slots, gate,
what they're waiting for) decides whether `step()` does anything this
frame. Ordering across nodes emerges from the wiring, not from a
scheduler. Gate-before-send (in0 asks readGate) means one writer per
slot, so no contention, no race resolution, no staging buffer.

## The spike (one session)

**Goal:** prove Shape A renders correctly when driven by a
step-function substrate, without touching the existing await
substrate.

1. New folder `tools/topology-vscode/src/substrate/step/` (scratch —
   delete on failure).
2. Define a minimal `Node` interface: `inputs`, `outputs`, `step()`.
   `step()` is a no-op unless internal conditions (gate ready, inputs
   present) are met.
3. Express Shape A's nodes as step-function `Node`s. One writer per
   slot; writer checks the downstream gate before writing.
4. Driver: `function tick(nodes) { for (const n of nodes) n.step() }`.
   Play = `setInterval(tick, frameMs)`. Pause = `clearInterval`.
5. Wire into the existing renderer (read node state after each tick,
   animate deltas). Do **not** migrate tests yet.
6. Run the editor. Does Shape A behave the same as on the await
   substrate?

## Decision point at end of spike

- **Works and feels obviously simpler →** next session does Shape D
  (the hard one — self-cycle was the await-substrate pain point). If
  Shape D also works, write a session-log entry proposing full
  migration. Subsequent tasks: port B, C, then delete the await
  substrate, then delete `handoff-timeout-removal.md` and the
  uniform-node plan.
- **Hits a wall →** document what blocked it in the session log, then
  reopen `handoff-timeout-removal.md` Step A with eyes open.

Don't migrate everything up front. The 265 green tests stay green on
the existing substrate while the spike proves itself.

## Why Shape D matters specifically

Shape D's self-feeding cycle is what required the `setTimeout(0)`
yield in `andGateLoopFanOut`. In a step-function model, "this tick's
output feeds next tick's input" is structural — there's no microtask
spin to escape. So Shape D should be *easier* in the new model than
the old. If it isn't, that's the signal to abandon the spike.

## Read before touching

- [handoff-next-task.md](handoff-next-task.md) — current Shape D
  wiring on the await substrate (reference for what behavior to
  reproduce).
- [handoff-cycle2-diagnosis.md](handoff-cycle2-diagnosis.md) — why
  feedback edges are consume-on-read on the await side; the
  step-function model handles this differently (next-tick read).
- [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md) —
  context on the ack mechanism the spike is replacing.

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
