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

// Treat the live spec as immutable: every edit produces a fresh top-level
// object via structuredClone, mutators run on the clone, then setSpec swaps
// the module reference. This keeps reference equality changing on every
// edit so future React useEffect([spec]) hooks fire correctly, and rules
// out the entire class of "stale pointer into the old spec" bugs.
export function mutateSpec(fn: (s: Spec) => void): Spec {
  const next = structuredClone(spec);
  fn(next);
  setSpec(next);
  return next;
}

export const view = { x: 0, y: 0, w: 1380, h: 740 };

export let viewerState: ViewerState = { ...DEFAULT_VIEWER_STATE };
export function setViewerState(next: ViewerState) {
  viewerState = next;
}

export const nodeById = new Map<string, Node>();
