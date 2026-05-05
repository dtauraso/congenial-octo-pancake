import { specToFlow } from "../adapter";
import { boxToViewport } from "../camera";
import { markViewSynced, scheduleViewSave } from "../../save";
import { clearViewerHistory, patchViewerState, setViewerState } from "../../state";
import { isLegacyCamera, parseViewerState, serializeViewerState } from "../../viewerState";
import type { AppCtx } from "./_ctx";

// "view-load" sidecar message: install viewerState, reconcile selection
// against the live node set, and apply persisted camera (with legacy
// SVG-viewBox migration if needed).
export function handleViewLoad(ctx: AppCtx, text: string | undefined) {
  const next = parseViewerState(text);
  setViewerState(next);
  // A fresh sidecar makes prior viewer history incoherent (folds/views/
  // bookmarks may not exist there).
  clearViewerHistory();
  markViewSynced(text ?? serializeViewerState(next));
  // If the spec already loaded *and* the sidecar has folds, rebuild now
  // so the folds (which live on viewerState, not the spec) appear.
  if (ctx.lastSpec.current && next.folds && next.folds.length > 0) {
    const flow = specToFlow(ctx.lastSpec.current, next.folds);
    ctx.setNodes(flow.nodes);
    ctx.setEdges(flow.edges);
  }
  // Always reconcile selection — empty case clears stale `selected`
  // flags from a prior render.
  const savedSel = new Set(next.lastSelectionIds ?? []);
  ctx.setNodes((ns) => {
    if (ns.length === 0) return ns;
    const present = new Set(ns.map((n) => n.id));
    const reconciled = [...savedSel].filter((id) => present.has(id));
    const want = new Set(reconciled);
    patchViewerState((v) => { v.lastSelectionIds = reconciled.length > 0 ? reconciled : undefined; });
    return ns.map((n) => {
      const wantSel = want.has(n.id);
      return n.selected === wantSel ? n : { ...n, selected: wantSel };
    });
  });
  const c = next.camera;
  if (c && !isLegacyCamera(c)) {
    ctx.rf.setViewport({ x: c.x, y: c.y, zoom: c.zoom });
  } else if (c) {
    // Legacy SVG viewBox sidecar — convert with the current pane size,
    // then rewrite `next.camera` in canonical form so the next save
    // persists the migrated shape.
    const pane = ctx.paneRef.current;
    if (pane) {
      const { width, height } = pane.getBoundingClientRect();
      const vp = boxToViewport(c, width, height);
      ctx.rf.setViewport(vp);
      next.camera = { x: vp.x, y: vp.y, zoom: vp.zoom };
      scheduleViewSave();
    }
  }
}
