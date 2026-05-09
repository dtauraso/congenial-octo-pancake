## 2026-05-07 — pulse label detaches from pulse on paused drag

**Observation:** With the runtime paused, dragging a node makes the
pulse label visibly separate from the pulse dot. Pressing play
re-attaches them on the next frame.

**Hypothesis / scope:** Follow-on from the paused-pulse-resumes fix.
That fix correctly skips rAF on a paused remount, but it also means
no frame is painted at all. The path's `d` updates via React, so the
dash sits on the new geom; but the label's `transform` was last set
by the previous mount's frame, which used the old geom's coords. So
the label stays at the old position while the dot jumps to the new
path.

**Decision:** Paint exactly one frame on mount when paused. With
`frozenElapsed = 0`, calling `frame()` once computes
`arcTraveled = startArc` against the new geom and updates both the
dash offset and the label transform.

**Outcome:** Patched `PulseInstance.tsx` to call `frame()` once in
the paused-on-mount branch. Build clean. User confirmed label now
tracks the pulse during paused drags.
