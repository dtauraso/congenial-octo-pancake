import { useCallback } from "react";
import type { Edge as RFEdge, Node as RFNode } from "reactflow";
import { flushViewSave, scheduleSave, scheduleViewSave } from "../../save";
import { getSpec, mutateViewer, viewerState } from "../../state";
import { pushSnapshot } from "../history";
import type { AppCtx } from "./_ctx";

export function useDeleteHandlers(ctx: AppCtx) {
  const handleDelete = useCallback((nodeIds: string[], edgeIds: string[]) => {
    if (!ctx.lastSpec.current) return;
    if (nodeIds.length === 0 && edgeIds.length === 0) return;

    // Pre-compute cascade so RF setNodes/setEdges mirrors incident-edge removal.
    const delNodes = new Set(nodeIds);
    const delEdges = new Set(edgeIds);
    for (const e of getSpec().edges) {
      if (delNodes.has(e.source) || delNodes.has(e.target)) delEdges.add(e.id);
    }

    // Snapshot BEFORE deletion so undo restores the pre-delete state.
    pushSnapshot();

    ctx.setNodes((ns) => ns.filter((n) => !delNodes.has(n.id)));
    ctx.setEdges((es) => es.filter((e) => !delEdges.has(e.id)));

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
