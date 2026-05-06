## 2026-05-04 — pulse label slides into target node before fading

**Branch:** task/fix-pulse-label-early-fade
**Mode:** smoothness audit (probe threshold 0.01)
**Cost:** untracked (user waived)

After the slowdown fix shipped, user noted the label kept full
opacity past the arrow tip and slid into the target node's box
before fading. Cause: opacity was keyed to `arcTraveled` (the dot /
back of dash) but the label rides `PULSE_DASH_PX/2` ahead in arc
space. Fade started at `overall = 0.95` (i.e. dot at 0.95 of
svgArc), which corresponds to the label already being at
`0.95 + PULSE_DASH_PX / (2 * svgArc)` — past the arrow tip and
overlapping the node. Fix at
[AnimatedEdge.tsx:468-473](../../../tools/topology-vscode/src/webview/rf/AnimatedEdge.tsx#L468-L473):
key the label's opacity to `labelArcSvg / svgArc` instead of
`overall`, so the fade trips spatially at 0.95 of the path —
before the node. Dot keeps its own envelope. Build + 157 tests
green.
