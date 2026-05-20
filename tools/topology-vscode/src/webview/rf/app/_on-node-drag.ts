import { useCallback } from "react";
import type { Node as RFNode } from "reactflow";
import { NODE_TYPES } from "../../../schema";
import { scheduleSave, scheduleViewSave } from "../../save";
import { mutateSpec, patchViewerState, spec, viewerState } from "../../state";
import { pushSnapshot } from "../history";
import { rfSetNodes } from "../rf-imperative";
import { ALIGN_TOL } from "./_constants";
import type { AppCtx } from "./_ctx";

type Guides = { vx: number | null; hy: number | null };

export function useNodeDrag(
  ctx: AppCtx,
  guides: Guides,
  setGuides: (g: Guides) => void,
) {
  const onNodeDrag = useCallback((_ev: React.MouseEvent, node: RFNode) => {
    if (node.type === "fold") {
      // Fold placeholder dimensions vary; skipping keeps the matcher
      // honest and avoids guides that snap to a moving target.
      if (guides.vx !== null || guides.hy !== null) setGuides({ vx: null, hy: null });
      return;
    }
    const def = NODE_TYPES[node.type as string] ?? NODE_TYPES.Generic;
    const cx = node.position.x + def.width / 2;
    const cy = node.position.y + def.height / 2;
    let vx: number | null = null;
    let hy: number | null = null;
    for (const other of ctx.rf.getNodes()) {
      if (other.id === node.id || other.type === "fold") continue;
      const odef = NODE_TYPES[other.type as string] ?? NODE_TYPES.Generic;
      const ocx = other.position.x + odef.width / 2;
      const ocy = other.position.y + odef.height / 2;
      if (vx === null && Math.abs(ocx - cx) < ALIGN_TOL) vx = ocx;
      if (hy === null && Math.abs(ocy - cy) < ALIGN_TOL) hy = ocy;
      if (vx !== null && hy !== null) break;
    }
    if (vx !== guides.vx || hy !== guides.hy) setGuides({ vx, hy });
  }, [ctx, guides.vx, guides.hy, setGuides]);

  const onNodeDragStop = useCallback((_ev: React.MouseEvent, node: RFNode) => {
    setGuides({ vx: null, hy: null });
    if (node.type === "fold") {
      // Persist fold-placeholder drags back to RF node data so the
      // position is available for serialization.
      if (!viewerState.folds?.some((x) => x.id === node.id)) return;
      pushSnapshot();
      rfSetNodes((ns) => ns.map((n) =>
        n.id === node.id
          ? { ...n, data: { ...n.data, position: [node.position.x, node.position.y] } }
          : n
      ));
      scheduleViewSave();
      return;
    }
    // RF tracks node position natively via node.position — no viewerState write needed.
    void mutateSpec; void scheduleSave; void spec; void viewerState; // keep imports until B-E complete
  }, [ctx, setGuides]);

  return { onNodeDrag, onNodeDragStop };
}
