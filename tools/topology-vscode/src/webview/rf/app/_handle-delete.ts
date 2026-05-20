import { useCallback } from "react";
import type { Edge as RFEdge, Node as RFNode } from "reactflow";
import { applyDelete } from "../../state/ops/delete";
import { flushViewSave, scheduleSave, scheduleViewSave } from "../../save";
import { getSpec, mutateBoth, mutateViewer, viewerState } from "../../state";
import type { AppCtx } from "./_ctx";

export function useDeleteHandlers(ctx: AppCtx) {
  const handleDelete = useCallback((nodeIds: string[], edgeIds: string[]) => {
    if (!ctx.lastSpec.current) return;
    if (nodeIds.length === 0 && edgeIds.length === 0) return;

    // Pre-compute cascade so RF setNodes/setEdges can mirror applyDelete's
    // incident-edge removal without a second spec scan.
    const delNodes = new Set(nodeIds);
    const delEdges = new Set(edgeIds);
    for (const e of getSpec().edges) {
      if (delNodes.has(e.source) || delNodes.has(e.target)) delEdges.add(e.id);
    }

    // RF mutation (parallel with mutateBoth — temporary dual-write).
    ctx.setNodes((ns) => ns.filter((n) => !delNodes.has(n.id)));
    ctx.setEdges((es) => es.filter((e) => !delEdges.has(e.id)));

    // mutateBoth: applyDelete patches both spec and viewerState (orphan
    // cleanup in views/folds/lastSelectionIds). Cmd-Z must restore both
    // surfaces in one step.
    mutateBoth((s, v) => { applyDelete(s, v, nodeIds, edgeIds); });
    ctx.lastSpec.current = getSpec();
    // applyDelete cascades — RF only removed the items its own change
    // set named, so rebuild from the post-delete spec to flush stale
    // visuals before the host save round-trip.
    ctx.rebuildFlow();
    scheduleSave();
    scheduleViewSave();
  }, [ctx]);

  const onNodesDelete = useCallback((deleted: RFNode[]) => {
    // Folds live in viewerState, not the spec — split them out so
    // applyDelete doesn't try to remove them from spec.nodes.
    const foldIds = deleted.filter((n) => n.type === "fold").map((n) => n.id);
    const specIds = deleted.filter((n) => n.type !== "fold").map((n) => n.id);
    if (foldIds.length > 0 && viewerState.folds) {
      mutateViewer((s) => {
        s.folds = (s.folds ?? []).filter((f) => !foldIds.includes(f.id));
      });
      console.info(`[fold] removed: ${foldIds.join(", ")}`);
      flushViewSave();
      if (specIds.length === 0) {
        ctx.rebuildFlow();
        return;
      }
    }
    handleDelete(specIds, []);
  }, [ctx, handleDelete]);

  const onEdgesDelete = useCallback((deleted: RFEdge[]) => {
    handleDelete([], deleted.map((e) => e.id));
  }, [handleDelete]);

  return { onNodesDelete, onEdgesDelete };
}
