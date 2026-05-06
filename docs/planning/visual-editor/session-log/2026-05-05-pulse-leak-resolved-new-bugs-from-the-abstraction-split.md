## 2026-05-05 — pulse-leak resolved; new bugs from the abstraction split

**Branch:** task/pulse-animation-abstraction (4d4ae63)
**Mode:** done; handoff written.

The pulse-leak-investigation root cause was identified: not a
defer-mode counter regression but a fold-vs-defer ownership gap.
PulseInstance owned the slot-release bridge; folded edges suppressed
PulseInstance; bridge never fired; readGate's chainIn slot was held
forever; chainIn declined indefinitely waiting for an ack queued
behind the held slot.

Fix lifted lifecycle ownership to a runner-layer module
(`src/sim/runner/pulse-lifetimes.ts`), subscribed to `notify(emit)`
at webview boot. Contract C6 pins the new invariant; contract C4
inverted to pin that PulseInstance must NOT touch activeAnimations.
204/204 tests pass. Three time-spaced probes confirm cycle advances
5 → 7 → 13 across 30s where it previously froze at 1.

**Two new bugs introduced by the design.** The lifecycle clock (2s
default) is decoupled from visual duration (~10s on the longest
edge). On `i1.out->readGate.ack`, dump 3 captured 6 simultaneous
PulseInstance components (IDs 49, 54, 57, 64, 69, 72) plus
`msSinceLastFrame: 1615ms` (rAF normally ~16ms). Visual stacking
and frame stall.

User accepted these as trade-offs to ship the livelock fix and
asked to wrap with a handoff documenting follow-ups. Three
candidate directions (A renderer-authoritative completion, B
per-edge visual concurrency cap, C shorten long routes) recorded
in handoff.md. A is the principled answer; B is defense in depth;
C doesn't generalize.

**What worked methodologically.** Instrumented before guessing.
Three time-spaced probe captures — first dump (state at stuck-anim),
1.5s follow-up (clock-vs-arc check), 30s third (genuine stall vs
slow recovery) — distinguished four hypotheses (clock frozen,
geom rerun, completion path, gating bug) cleanly. The third dump
plus cross-reference with `.probe/fold-halo-last.json` was what
identified the fold-vs-defer ownership gap. Without the
instrumentation we'd have shipped option A (clamp duration) which
masks symptoms without fixing the architectural gap.
