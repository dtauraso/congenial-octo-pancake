---
name: Pulse-label offset rule per route kind
description: How the riding pulse label is offset from the dot — different rule per route kind, mixing them produces tangent slip
type: project
---

The riding pulse label in `AnimatedEdge.tsx` uses a route-kind-
dependent offset rule. Mixing them is a known footgun; the probe
(`window.__pulseProbeLog`, file-bridge at `../.probe/pulse-last.json`)
catches it as **tangent slip > 0** even when the perpendicular
drift is zero.

**Axis-aligned routes (`snake`, `below`).**

```
nx =  |tangent.y|
ny = -|tangent.x|
```

Always above horizontal segments, right of vertical segments,
with a smooth quarter-circle blend through 90° corners. Stays
perpendicular to tangent **only because** these routes never
have tangents outside the first quadrant — every segment has
non-negative tx and ty (or both flipped, but never mixed-sign).

**Cubic / line routes.**

```
nx = -tangent.y;
ny =  tangent.x;
if (ny > 0) { nx = -nx; ny = -ny; }   // upward bias
```

Classic perpendicular-with-upward-bias. Required because cubic
tangents pass through every quadrant; the absolute-value rule
above is *not* perpendicular for second/fourth-quadrant tangents
and the label slides along the path direction (tangent slip).

**Why:** The "always above / always right" spec the user signed
off on (2026-05-04, `task/ack-edge-junction-jerk`) is geometrically
incompatible with "always perpendicular to tangent" once tangents
escape the first quadrant. Splitting the rule per route kind
gives perpendicularity everywhere it's expressible AND the
"always above / always right" placement on the routes where it
matters visually.

**How to apply:** If the pulse-probe log shows a `tangentSlip`
entry with negligible `drift`, the label rule is being applied to
a route whose tangents leave the first quadrant — most likely
the absolute-value rule applied to a cubic edge. Re-check the
`route === "snake" || route === "below"` gate around the rule
choice; don't fold the cases together.
