## 2026-05-07 — paused pulse resumes on node touch/drag

**Observation:** With the animation paused, touching or dragging
any node causes the in-flight pulse to finish its arc instead of
staying frozen.

**Hypothesis / scope:** `PulseInstance` effect deps are
`[geom, speedPxPerMs]`. A drag rebuilds geom → effect tears down
and remounts. The pause-freeze only listens to `subscribeWiresPause`
events; on a fresh mount it does not consult
`isWiresRuntimePaused()`, so a new rAF loop kicks off and the pulse
runs to completion regardless of pause state.

**Decision:** Fix on `task/node-ticks`. Initialise `frozenElapsed`
on mount when the runtime is currently paused, and skip the initial
rAF schedule.

**Outcome:** Patched `PulseInstance.tsx` to read
`isWiresRuntimePaused()` on mount; if paused, set
`frozenElapsed = 0` and don't request the first frame. Resume path
already handles the rebase.
