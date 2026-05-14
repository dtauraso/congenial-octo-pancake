# Phase 1 — pipeline foundations ✅

**Cap:** ~2, done. **$ extra-usage est:** ~$120 (range $60–$200, 1× mixed). Actual not tracked (pre-spillover).
*React-Flow-affected items re-ported during Phase 3 migration.*

- **[~1]** Tighten codegen integration: structured `topogen` invocation on debounced save (250ms, queued, no overlap); status indicator (green / amber / red). *Inline error surfacing on the offending node/edge deferred — topogen errors are bare strings, would need a structured error format to attach to specific node IDs.* **Renderer-independent — survives React Flow migration unchanged.**
- **[~½]** Spec/viewer split: `topology.view.json` sidecar with `camera`, `views`, `folds`, `bookmarks`, `lastSelectionIds`. No migration needed — `topology.json` had no viewer fields. **Renderer-independent — survives unchanged. React Flow's `folds` representation will use its subflow primitive, but the sidecar schema is the same.**
- **[~½]** Lock down stable-layout invariants: pan/zoom debounced-saves to sidecar; camera restored on load; node positions never auto-shift. **Re-port required: wire React Flow's `onMove` / `onNodeDragStop` to the existing sidecar persistence. Folded into the Phase 3 migration estimate.**
