import type { Node, Spec } from "../schema";
import { DEFAULT_VIEWER_STATE, type ViewerState } from "./viewerState";

export const SVG_NS = "http://www.w3.org/2000/svg";

export let spec: Spec = { nodes: [], edges: [] };
export function getSpec(): Spec {
  return spec;
}
export function setSpec(next: Spec) {
  spec = next;
  nodeById.clear();
  for (const n of next.nodes) nodeById.set(n.id, n);
}

export const view = { x: 0, y: 0, w: 1380, h: 740 };

export let viewerState: ViewerState = { ...DEFAULT_VIEWER_STATE };
export function setViewerState(next: ViewerState) {
  viewerState = next;
}

export const nodeById = new Map<string, Node>();
