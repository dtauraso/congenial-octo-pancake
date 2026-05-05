import { useCallback } from "react";
import type { Node as RFNode } from "reactflow";
import { NODE_TYPES } from "../../../schema";
import { isPlaying as isRunnerPlaying } from "../../../sim/runner";
import { MOTION_TYPES } from "../../../sim/handlers";
import { scheduleSave, scheduleViewSave } from "../../save";
import { mutateSpec, patchViewerState, spec, viewerState } from "../../state";
import { ALIGN_TOL } from "./_constants";
import type { AppCtx } from "./_ctx";

type Guides = { vx: number | null; hy: number | null };

export function useNodeDrag(
  ctx: AppCtx,
  guides: Guides,
  setGuides: (g: Guides) => void,
) {
  const onNodeDrag = useCallback((_ev: React.MouseEvent, node: RFNode) => {
    if (ctx.isReadOnlyView()) return;
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
    if (ctx.isReadOnlyView()) return;
    if (node.type === "fold") {
      // Persist fold-placeholder drags back into viewerState.folds so
      // the position survives reload (folds live in the sidecar).
      if (!viewerState.folds?.some((x) => x.id === node.id)) return;
      patchViewerState((v) => {
        const f = v.folds?.find((x) => x.id === node.id);
        if (f) f.position = [node.position.x, node.position.y];
      });
      scheduleViewSave();
      return;
    }
    const sn = spec.nodes.find((n) => n.id === node.id);
    if (!sn) return;
    const dx = node.position.x - sn.x;
    const dy = node.position.y - sn.y;
    if (dx === 0 && dy === 0) return;
    // Phase 6 Chunk B record-mode-lite: paused drag on a motion-bearing
    // node rewrites the per-phase slide rule (props.slidePx/slideDy) so
    // the next firing lands at the dropped position. base (x, y) is the
    // origin the slide accumulates from, not the rendered position, so
    // editing it would shift the entire trajectory.
    if (MOTION_TYPES.has(sn.type) && !isRunnerPlaying()) {
      const next = mutateSpec((s) => {
        const target = s.nodes.find((n) => n.id === node.id);
        if (!target) return;
        const p = { ...(target.props ?? {}) };
        p.slidePx = Number(p.slidePx ?? 30) + dx;
        p.slideDy = Number(p.slideDy ?? 0) + dy;
        target.props = p;
      });
      ctx.lastSpec.current = next;
      // Spec base x/y didn't change, so RF must re-snap to the original
      // position — otherwise the dragged-to coordinate sticks visually
      // and compounds with the next state.dx tween.
      ctx.rebuildFlow();
      scheduleSave();
      return;
    }
    const next = mutateSpec((s) => {
      const target = s.nodes.find((n) => n.id === node.id);
      if (!target) return;
      target.x = node.position.x;
      target.y = node.position.y;
    });
    ctx.lastSpec.current = next;
    scheduleSave();
  }, [ctx, setGuides]);

  return { onNodeDrag, onNodeDragStop };
}
