## 2026-05-04 — pulse label end-of-edge slowdown

**Branch:** task/fix-pulse-label-end-slowdown
**Mode:** smoothness audit (probe threshold 0.01)
**Start cost:** $345.38

User observation: "when the label is right above the arrow it slows
down by 2x." Diagnosis: in
[AnimatedEdge.tsx:429-430](../../../tools/topology-vscode/src/webview/rf/AnimatedEdge.tsx#L429-L430)
the label rides the *visible* midpoint of the dash:
`labelArcSvg = (arcTraveled + headArc) / 2` with
`headArc = min(svgArc, arcTraveled + PULSE_DASH_PX)`. Once `headArc`
clamps to `svgArc`, the right endpoint stops moving while
`arcTraveled` keeps advancing — so the label's arc-position advances
at half the rate. Geometric, not a timing bug. The dot has the same
clipping but its brightness fade hides it.

Fix (option 2 of 3 considered — XS): widened the opacity envelope
from `0.95..1` (0.05 ramp) to `0.90..1` (0.10 ramp) at
[AnimatedEdge.tsx:418](../../../tools/topology-vscode/src/webview/rf/AnimatedEdge.tsx#L418)
so the label is mostly invisible during the final `PULSE_DASH_PX`
where the slowdown lives. Doesn't fix the geometry; hides it behind
the existing fade. Build + 157 tests green. User to judge feel.

Options not taken: (1) drop visible-midpoint for fixed-offset midpoint
— replaces slowdown with a brief stop at the endpoint, probably worse.
(3) extend path with invisible tail of length `PULSE_DASH_PX` — clean
geometric fix but touches edge geometry / arrowhead placement; revisit
if this resurfaces.

**Followups (candidates, not commitments):**
- If the wider fade looks too eager (label disappears too far from
  arrow), revert to 0.95/0.05 and pursue option 3 (path tail).
- Symmetric question: does the dot itself slow visibly at end now
  that the label fades earlier? If yes, option 3 covers both.

**Update — fade alone insufficient.** User: "I still see the 1/2
speed change. the only difference is there is a fraction of a
second fade out before disapparing." Slowdown begins at
`overall = 1 - PULSE_DASH_PX/svgArc` (often <0.90), so widening the
fade only catches the tail. Reverted opacity to 0.95/0.05 and
swapped to option 3-lite: replaced the visible-midpoint formula
with `labelArcSvg = arcTraveled + PULSE_DASH_PX/2` (constant offset
from the back of the dash, no clamp). Past `svgArc` the label
position extrapolates from the path-end point along the end tangent
so the label rides off the edge at constant speed and the existing
opacity envelope fades it as it exits. Same `queryTangent` call as
before; tangent is queried at `min(labelArcSvg, svgArc)` and reused
for both extrapolation and the normal-direction offset, so no new
sampling mismatch. Build + 157 tests green.
