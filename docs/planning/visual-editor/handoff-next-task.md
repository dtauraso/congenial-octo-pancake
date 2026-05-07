# Handoff — Next task (START HERE)

**Port-plan step 2: per-node running indicator + reloop glyph.**
Step 1 (chan→wire renderer + 2-node topology + working play/pause)
is done and the substrate path is decoupled from the legacy runner.
Step 2's spec lives at
[../sim-substrate/rebuild-plan.md](../sim-substrate/rebuild-plan.md)
§"Visual layer" item 2.

## What just landed (this branch, this session)

- Substrate is now ack-driven via an `edge-ready` bus event.
  AnimatedEdge fires it from its subscribe useEffect; substrate
  gates the first emit on receipt so the cap=0 loop can't drop the
  leading token.
- `loadSubstrate` runs synchronously before `setNodes`/`setEdges`
  in `_handle-load.ts` so the substrate's emit-bus subscription is
  registered before AE mounts and signals readiness.
- Identical-text load messages are deduped to absorb React
  StrictMode + send-on-ready double-fires.
- Substrate owns `_running`; toolbar play/pause routes through
  `pauseSubstrate`/`resumeSubstrate`. Sim clock freeze IS the
  visual pause (PulseInstance no longer gates rAF on isPlaying).
- `awaitingAck` flag prevents resume-during-in-flight from
  injecting a duplicate token (was producing visible "11"/"00"
  combinations).
- Contract test: `test/contracts/substrate-ack-driven.test.ts`
  (6 tests covering edge-ready handshake, ack-driven cadence,
  queue refill, pause/resume invariants).
- Integration test: `e2e/substrate-pause-resume.spec.ts` regression
  guard for the pause-resume duplicate.

## Still listed in step-1 build notes as a "coupling hack"

Items 1 and 4 from
[handoff-step1-notes.md](handoff-step1-notes.md) (visual-slot
ledger reset and PulseAckEvent on the shared bus) remain. Items 2
and 3 (legacyRunnerState.playing hijack and pauseRunner call) are
gone — substrate now owns play state and resetRunner replaces
pauseRunner.

## Step 2 budget and ground rules

Budget: $25 hard cap (default). One concern per commit. Do **not**
fold step 2 into a step-1 follow-up commit — both are independently
debuggable surfaces. Start step 2 only after the user confirms the
play/pause behavior on the current topology.

What "fixed" looks like for step 2:
  - Each node renders its "running" state visibly (animation,
    pulse, color shift — TBD per spec).
  - The reloop glyph is visible at the moment the input queue
    refills from spec.init (see substrate runtime's `emitNext`
    refill branch).

If a step-2 assumption breaks (renderer location, reloop trigger
shape, etc.), stop at the cap and write a one-paragraph note in
[../sim-substrate/rebuild-plan.md](../sim-substrate/rebuild-plan.md)
naming which assumption broke. Sunk-cost reasoning is the failure
mode this cap defends against — do not raise it without explicit
sign-off.
