## 2026-05-05 — pulse animation leak: 5 of 6 edges stuck per cycle

**Branch:** task/pulse-leak-investigation
**Mode:** debug, in-flight.

User reported: pulses run for a while, then stop and don't restart.
Bisected via the new RunnerProbe (merged d843036) to bug B
(stuck-anim, Contract C4 regression). Per-edge breakdown captured:

```
⚠ stuck-anim: 5 [
  i0.out->i1.in,
  i0.inhibitOut->inhibitRight0.left,
  i1.out->readGate.ack,
  i1.inhibitOut->inhibitRight0.right,
  in0.out->readGate.chainIn
]
```

Each edge leaks exactly 1 pulse. Only `readGate.out->i0.in` is
never in the leaked set. Topology has 6 edges total.

**Suggestive pattern.** The exception is the edge whose source is the
ReadGate. That edge fires N times per cycle (one per input value);
the others fire either at gate-mediated points or as feedback. So
the rule may be: "every pulse that fires from a non-ReadGate source
gets stuck once per cycle." Or equivalently: every pulse stuck mid-
flight EXCEPT pulses traveling along readGate.out->i0.in.

**Hypothesis to test first.** PulseInstance's makeFrame computes
`localT = elapsed / remainingMs` and only calls onComplete when
localT >= 1. If `getSimTime()` advances such that elapsed never
reaches remainingMs for those 5 edges (some kind of clock-vs-arc
mismatch tied to the tick that kicks them off), the rAF loop runs
forever without completing. The readGate.out edge's pulses might
be unaffected if their `simStart` is captured at a different point
in the tick boundary.

**Investigation steps not yet taken:**
1. Instrument makeFrame to log first 30s of each pulse's localT
   progression — see whether stuck pulses freeze at a particular
   localT value.
2. Check whether stuck pulses' `swapStart` is captured before vs
   after the runner's `state.simSegmentStartWall` was reset.
3. Check whether geom changes mid-flight on those edges (e.g. fold
   collapse causing a re-route).
4. Verify Contract C4 test still pins the once-per-mount invariant
   it claims to — possibly the regression is in a path the test
   doesn't cover (e.g. the geom-rerun branch in PulseInstance).

**Why this needs its own branch.** Iterating on rebuild-and-check
in the live editor was burning cycles without converging. Need
proper instrumentation, not blind hypotheses.
