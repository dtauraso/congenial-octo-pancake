## 2026-05-03 — smooth node drag (un-snap)

**Branch:** task/smooth-node-drag
**Mode:** smoothness audit fix (audits.md #5, item 1 from prior log)
**Start cost:** $317.49

Drag-jerkiness root cause was not render cost (5 nodes / 6 edges).
ReactFlow had `snapToGrid={true}` with `snapGrid=[24, 24]` set on the
canvas — node position quantized to 24px steps during drag, which
*is* the "stepped/laggy rather than continuous" feel reported. Fix:
drop both props (and the unused `GRID` constant). No snap on drop
either, matching the prior log's note that no grid size was chosen.
Build + 157 tests green. User to verify in webview.
