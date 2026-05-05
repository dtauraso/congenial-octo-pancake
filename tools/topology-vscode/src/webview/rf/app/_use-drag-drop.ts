import { useCallback } from "react";
import { NODE_TYPES } from "../../../schema";
import { specToFlow } from "../adapter";
import { IDENT_RE } from "../../rename-core";
import { scheduleSave } from "../../save";
import { mutateSpec, spec, viewerState } from "../../state";
import { PALETTE_DATA_TYPE } from "../NodePalette";
import type { AppCtx } from "./_ctx";

export function useDragDrop(ctx: AppCtx) {
  const onDragOver = useCallback((ev: React.DragEvent) => {
    if (!Array.from(ev.dataTransfer.types).includes(PALETTE_DATA_TYPE)) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback((ev: React.DragEvent) => {
    if (ctx.isReadOnlyView()) return;
    const type = ev.dataTransfer.getData(PALETTE_DATA_TYPE);
    if (!type || !NODE_TYPES[type]) return;
    ev.preventDefault();
    if (!ctx.lastSpec.current) return;
    const pos = ctx.rf.screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
    // Mint a unique id from the type. Lowercase first char so the id is
    // a valid Go identifier the first time topogen consumes it.
    const base = type.charAt(0).toLowerCase() + type.slice(1);
    let n = 0;
    let id = `${base}${n}`;
    while (spec.nodes.some((nd) => nd.id === id)) {
      n += 1;
      id = `${base}${n}`;
    }
    if (!IDENT_RE.test(id)) return;
    const next = mutateSpec((s) => {
      s.nodes.push({ id, type, x: pos.x, y: pos.y });
    });
    ctx.lastSpec.current = next;
    const flow = specToFlow(next, viewerState.folds);
    ctx.setNodes(flow.nodes);
    ctx.setEdges(flow.edges);
    scheduleSave();
  }, [ctx]);

  return { onDragOver, onDrop };
}
