import { specToFlow } from "../adapter";
import { markViewSynced, scheduleViewSave } from "../../save";
import { clearViewerHistory, patchViewerState, setViewerState } from "../../state";
import { parseViewerState, serializeViewerState } from "../../viewerState";
import { resolveViewLoadViewport } from "./_resolve-view-load-viewport";
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
  const paneRect = ctx.paneRef.current?.getBoundingClientRect() ?? null;
  const resolution = resolveViewLoadViewport(next.camera, paneRect);
  if (resolution.kind === "direct") {
    ctx.rf.setViewport(resolution.viewport);
  } else if (resolution.kind === "migrated") {
    // Legacy SVG viewBox sidecar — apply the migrated viewport and rewrite
    // next.camera in canonical form so the next save persists the new shape.
    ctx.rf.setViewport(resolution.viewport);
    next.camera = resolution.viewport;
    scheduleViewSave();
  }
}
