---
name: project-runstart-concept-needed
description: Substrate-r has no shared tick-0/run-start signal; seed-as-dest-prefill and InputBody self-start RAF are local mount hacks that should be replaced by one substrate concept.
metadata:
  type: project
---

Substrate-r currently has no shared tick-0 / run-start event. Two
local mount hacks fill the gap:

- **Seed:** `Wire.tsx` (effect around line 424) calls
  `dest.fill(destSlotId, seed)` directly at mount — bypassing
  `wire.load` and the animation. This is a second value-delivery
  path parallel to the normal `wire.load → animate → dest.fill`.
- **InputBody:** `node-kinds.tsx` (~line 54) starts its own RAF
  loop in a mount `useEffect`, self-triggering its first emit.

Consequence: "what happens at tick 0" has no single answer; you have
to read three files (Wire seed effect, InputBody mount RAF, ReadGate
all-filled gate) and reconcile their wall-clock timings. The ring
animates correctly today only because mount-time seed prefill +
ReadGate's all-filled gate accidentally pair seed with in0[0]'s
late arrival. Visually i1 looks silent at tick 0 — there's no
source-side launch, so no pulse leaves i1.

**Why:** During the seed feature landing (`f273f6a`), seed was
implemented as the smallest thing that broke the ring's chicken-
and-egg deadlock. Run-start as a substrate concept was deferred.
The cost surfaces as diagnostic friction: simple questions like
"why does seed skip the animation?" require multi-file traces
because seed is a special case bolted onto Wire, not the same
kind of thing as a normal value delivery.

**How to apply:** When the next task touches startup, seed, or
"what triggers in0's first emit", do not patch locally. Introduce a
shared run-start signal in substrate-r (observable along the same
lines as `PauseAxis`, or an explicit Start node in the topology).
Then:

- Seed becomes `wire.load(seed)` on run-start (one delivery path).
- InputBody's first emit subscribes to run-start instead of self-
  starting on mount.
- Tick-0 coincidence becomes structural (single trigger), not
  wall-clock-lucky.

Related: [[feedback-uniform-pulse-speed]] (uniform speed + matched
wire lengths gives coincident arrival once launches are coincident),
[[feedback-edge-seed-required-for-rings]] (current seed behavior).

## Resolution (2026-05-17)

**Status: superseded / partially resolved. No new substrate axis added.**

Decision (made with David): run-start is NOT a substrate concept;
it would be scheduling-vocabulary drift. The two mount hacks are
independent symptoms with independent local fixes.

**Seed fix** (`719e8c7`): Wire.tsx seed effect now calls `load(seed)`
instead of `dest.fill(destSlotId, seed)`. The value enters in-flight,
animates, and delivers via the normal arrive → dest.fill path. One
delivery path instead of two. Tick-0 coincidence is now structural
(animation arrival time is geometry-determined), not mount-time
teleportation.

**InputBody self-RAF** (STOP — not changed): investigation found
there is no central driver RAF loop. Each node kind (`InputBody`,
`RelayBody`, `JoinBody`, etc.) owns its own `useEffect` RAF loop.
Deleting InputBody's self-RAF would leave it with no wakeup mechanism.
The self-RAF is not a redundant hack — it IS the mechanism. The
feedback memory `feedback_run_is_input_only.md` states the same: node
bodies self-wake via their own RAF loop. No code change at this site.

**Consequence for "what happens at tick 0"**: seed arrival is now one
wire.load call, observable via the animation. The diagnostic friction
of tracing across dest.fill vs wire.load is gone for the seed side.
The InputBody self-trigger at mount is still a special case (it fires
as soon as its outWire canAccept, with no structural relationship to
seed arrival or ReadGate filling), but this is the model — there is
no shared start signal, and that is intentional.
