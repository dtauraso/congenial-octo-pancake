# Phase 6 — keyframed motion (when a topology actually rewires during its cycle)

**Cap:** ~2.5 (risk to ~4) + ~⅜ tests. **$ extra-usage est:** ~$225 (range $115–$400, 1.5× UI-iteration heavy: keyframe interpolation + record-mode); risk-case ~$360 (up to ~$560). Rebudget after Phase 5.5.

- **[~⅛]** ⏳ Tier 1 round-trip coverage extended to `positionKeyframes` / `endpointKeyframes` / `visibility` *before* any UI lands (each new spec field becomes a fixture row; the bridge can't silently drop them).
- **[~¼]** Schema: `positionKeyframes`, `endpointKeyframes`, `visibility`.
- **[~¾]** Renderer tweens between keyframes during playback.
- **[~½]** Decide whether `topogen` reads keyframes (yes if the runtime causes the change; no if it's pure presentation). Spec-vs-viewer judgment per keyframe kind is the risk multiplier.
- **[~1]** Record-mode editor: drag at non-zero playhead → new keyframe.
- **[~⅛]** ⏳ Tier 2 invariant test: viewer-kind keyframes never reach topogen input; spec-kind keyframes always do. Run topogen against a spec containing both, assert generated Go references the spec keyframes and ignores the viewer ones. Promotes the spec-vs-viewer keyframe judgment from per-case decision to enforced contract.
- **[~⅛]** ⏳ Tier 3 system-shape test: keyframe + playback + bookmark. At a non-zero bookmark, paused playback must show the interpolated position for keyframed nodes; resuming must continue from that interpolation, not jump to t=0. Catches the master-clock-vs-keyframe-cursor desync bug that's the obvious failure mode of mixing clocks.
- **[~⅛]** ⏳ Tier 3 system-shape test: keyframe + record-mode + saved-view. Recording a new keyframe inside a saved view must not affect non-member nodes' keyframes. Locks down the rule that record-mode is scoped to whatever's interactive at the playhead, not the whole spec.
