// Pure delete logic, separated from the DOM-driven editor in app.tsx so
// unit tests can exercise it without standing up the webview. Mirrors
// rename-core.ts in shape.

import type { Spec } from "../schema";
import type { ViewerState } from "./viewerState";

// Mutates spec and viewerState in place. Removes the listed nodes and
// edges, plus any edges incident to deleted nodes (RF surfaces them
// separately on multi-select, but the contract holds either way), and
// scrubs every reference to those ids from timing and viewer state.
// Returns the set of edge ids actually removed (incident-edge cascade
// included), so callers can update RF state without recomputing.
export function applyDelete(
  spec: Spec,
  viewerState: ViewerState,
  nodeIds: string[],
  edgeIds: string[],
): { removedNodeIds: Set<string>; removedEdgeIds: Set<string> } {
  const delNodes = new Set(nodeIds);
  const delEdges = new Set(edgeIds);

  // Cascade: any edge incident to a deleted node is also deleted.
  for (const e of spec.edges) {
    if (delNodes.has(e.source) || delNodes.has(e.target)) delEdges.add(e.id);
  }

  spec.nodes = spec.nodes.filter((n) => !delNodes.has(n.id));
  spec.edges = spec.edges.filter((e) => !delEdges.has(e.id));

  if (spec.timing) {
    for (const s of spec.timing.steps) {
      if (s.fires) s.fires = s.fires.filter((x) => !delNodes.has(x));
      if (s.departs) s.departs = s.departs.filter((x) => !delEdges.has(x));
      if (s.arrives) s.arrives = s.arrives.filter((x) => !delEdges.has(x));
      if (s.state) {
        for (const id of delNodes) delete s.state[id];
      }
    }
  }

  if (viewerState.views) {
    for (const v of viewerState.views) {
      v.nodeIds = v.nodeIds.filter((x) => !delNodes.has(x));
    }
  }
  if (viewerState.folds) {
    for (const f of viewerState.folds) {
      f.memberIds = f.memberIds.filter((x) => !delNodes.has(x));
    }
  }
  if (viewerState.lastSelectionIds) {
    const next = viewerState.lastSelectionIds.filter((x) => !delNodes.has(x));
    viewerState.lastSelectionIds = next.length > 0 ? next : undefined;
  }

  return { removedNodeIds: delNodes, removedEdgeIds: delEdges };
}
