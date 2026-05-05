import { NODE_TYPES, type Node as SpecNode } from "../../../schema";
import type { Fold } from "../../viewerState";

export const COLLAPSED_FOLD_W = 140;
export const COLLAPSED_FOLD_H = 60;
export const EXPANDED_PADDING = 16;

export function expandedBounds(fold: Fold, byId: Map<string, SpecNode>) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const id of fold.memberIds) {
    const n = byId.get(id);
    if (!n) continue;
    const def = NODE_TYPES[n.type];
    const w = def?.width ?? 110;
    const h = def?.height ?? 60;
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x + w > maxX) maxX = n.x + w;
    if (n.y + h > maxY) maxY = n.y + h;
  }
  if (!Number.isFinite(minX)) {
    return { x: fold.position[0], y: fold.position[1], w: COLLAPSED_FOLD_W, h: COLLAPSED_FOLD_H };
  }
  return {
    x: minX - EXPANDED_PADDING,
    y: minY - EXPANDED_PADDING,
    w: (maxX - minX) + EXPANDED_PADDING * 2,
    h: (maxY - minY) + EXPANDED_PADDING * 2,
  };
}
