---
name: Graph-node coordination pulse issues remain after unified-sim-clock work
description: After fixing simTime drift and per-edge serialization on 2026-05-04, the user reports remaining "graph node coordination pulse issues" — open thread, not yet diagnosed
type: project
---

Status as of 2026-05-04: edge-pulse animations are now anchored at emit-time and animate concurrently per edge (commits `91d673e` + `7a04fdd` on `task/unified-sim-clock`). The fold-node halo is "more stable and snappier at closer to the right times." But the user reports "still plenty of graph node coordination pulse issues" — pulse coordination *across* nodes (not within one edge) is still off.

**Why:** edge-pulse decoupling was only one of the timing-bug surfaces. Likely-remaining classes to scan when the user reopens this thread:
- Cross-edge concurrent emits triggered from one fire (e.g. inhibitor fan-out): each emit captures its own `simStart` but the React render that mounts them happens slightly after the step ends, so the *visual* synchronization across fan-out edges depends on rAF batching rather than a shared anchor.
- Node-internal animations (halo decay, ring pulses, port-dot flashes) that may still read wall-time or use their own scheduling rather than `getSimTime()`.
- Fold/collapsed-edge halo timing on member fires after halo collapse.

**How to apply:** next session on this thread, ask the user to point at one specific symptom (record a screencap or repro the specific node/edge) before scanning — "graph node coordination pulse issues" is too broad to fix cold. Then run the timeline-probe again with the specific edges/nodes selected and look for the same kind of decoupling pattern (emit simTime vs. anim/state-change simTime gaps).
