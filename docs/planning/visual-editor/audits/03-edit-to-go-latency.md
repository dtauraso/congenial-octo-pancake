### 3. Edit-to-Go latency

**What it checks.** Headline design criterion: a structural change
in the editor reaches running Go in under a second (ideally) and
under 30 seconds end-to-end (target). See `What success looks like`
in the parent plan.

**Backed by.** Phase 8 Tier 4 latency test (deferred then closed,
commit `f4c19ca`).

**Passing.** Latency stays within the documented envelope; any
regression has a recorded explanation.

**Cadence.** Nightly or weekly via existing test; on-demand when
something feels slow.

**Cost.** CI compute; model time only on regression.
