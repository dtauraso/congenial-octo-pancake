# Phase 2 — recall affordances ✅

**[≤2, done; React-Flow-affected items re-ported during Phase 3 migration]**

- **[~½]** Saved views: top-right panel, "+ save current" with inline name input, click-to-frame, non-member dim, pan/zoom clears the dim. Membership is bounding-box overlap with current viewport. **Re-port required: replace direct SVG bbox math with React Flow's `getNodes()` + `setViewport()` / `fitView()`; non-member dim becomes per-node className via React Flow's `nodes` prop. Folded into the Phase 3 migration estimate.**
- **[~1]** Bookmark markers on the animation timeline: bottom timeline with play/pause/scrub, "+ bookmark" pauses and prompts for a name at the current playhead, click marker to jump-and-pause, shift-click to delete. Refactored `animation.ts` onto a master playback clock. **Master clock survives unchanged. Re-port required for how animation drives node visual state: push per-frame node state into React Flow via `setNodes()` instead of mutating SVG attrs directly. Folded into the Phase 3 migration estimate.**
- **[~½]** One-click "build and run": "▶ run" button in the toolbar spawns `go run .` and streams stdout/stderr to a "topology run" output channel; button toggles to "■ stop" while running, status pill shows running/ok/error/cancelled. **Renderer-independent — survives unchanged.**
