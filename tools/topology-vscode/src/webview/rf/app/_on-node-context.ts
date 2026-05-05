import { useCallback } from "react";
import type { Node as RFNode } from "reactflow";
import { createFold, toggleFold } from "../../fold-core";
import { beginEditSublabel, beginRenameNodeId } from "../../inline-edit";
import { flushViewSave } from "../../save";
import { mutateViewer, spec, viewerState } from "../../state";
import type { AppCtx } from "./_ctx";

export function useNodeContextHandlers(ctx: AppCtx) {
  const onNodeDoubleClick = useCallback((ev: React.MouseEvent, node: RFNode) => {
    if (ctx.isReadOnlyView()) return;
    // Fold placeholder → toggle collapsed state. Expanded folds aren't
    // selectable, so dbl-click never fires on them; collapsing again
    // uses the right-click "fold selection" path on regular nodes.
    if (node.type === "fold") {
      const ok = mutateViewer((s) => toggleFold(s, node.id));
      if (ok) {
        const f = viewerState.folds?.find((x) => x.id === node.id);
        console.info(`[fold] toggled ${node.id} -> collapsed=${f?.collapsed}`);
        ctx.rebuildFlow();
        flushViewSave();
      }
      return;
    }
    // Anchor the input over the node wrapper, not whichever inner element
    // happened to receive the click (label / state-text divs are smaller
    // than the node and would offset the input).
    const t = ev.target as HTMLElement | null;
    const sublabelEl = t?.closest<HTMLElement>(".node-sublabel");
    if (sublabelEl) {
      beginEditSublabel(node.id, sublabelEl);
      return;
    }
    const wrapper =
      t?.closest<HTMLElement>(".react-flow__node") ??
      (ev.currentTarget as HTMLElement);
    // Prefer the label element so the input sits exactly where the id
    // text is drawn — content can be vertically offset when a node also
    // renders state-text lines.
    const label = wrapper.querySelector<HTMLElement>(".node-label");
    beginRenameNodeId(node.id, label);
  }, [ctx]);

  const foldCurrentSelection = useCallback(() => {
    if (ctx.isReadOnlyView()) return;
    const sel = new Set(viewerState.lastSelectionIds ?? []);
    const memberIds = Array.from(sel).filter((id) => spec.nodes.some((n) => n.id === id));
    if (memberIds.length < 2) {
      console.info(`[fold] need >=2 nodes selected to fold; have ${memberIds.length}`);
      return;
    }
    let cx = 0, cy = 0;
    for (const id of memberIds) {
      const n = spec.nodes.find((sn) => sn.id === id);
      if (n) { cx += n.x; cy += n.y; }
    }
    cx = cx / memberIds.length;
    cy = cy / memberIds.length;
    const id = mutateViewer((s) => createFold(s, memberIds, [cx, cy]));
    if (!id) {
      console.info(
        `[fold] createFold rejected (members may already be inside another fold): ${memberIds.join(", ")}`,
      );
      return;
    }
    console.info(`[fold] created ${id} with ${memberIds.length} members: ${memberIds.join(", ")}`);
    ctx.rebuildFlow();
    flushViewSave();
  }, [ctx]);

  const onSelectionContextMenu = useCallback(
    (ev: React.MouseEvent, _selNodes: RFNode[]) => {
      ev.preventDefault();
      foldCurrentSelection();
    },
    [foldCurrentSelection],
  );

  const onNodeContextMenu = useCallback((ev: React.MouseEvent, node: RFNode) => {
    ev.preventDefault();
    if (node.type === "fold") {
      console.info("[fold] right-click on a placeholder is a no-op; double-click to expand");
      return;
    }
    const sel = new Set(viewerState.lastSelectionIds ?? []);
    if (!sel.has(node.id)) {
      console.info(
        `[fold] right-clicked node "${node.id}" is not in the selection (${sel.size} selected); shift-click to add it before folding`,
      );
      return;
    }
    foldCurrentSelection();
  }, [foldCurrentSelection]);

  return { onNodeDoubleClick, onSelectionContextMenu, onNodeContextMenu };
}
