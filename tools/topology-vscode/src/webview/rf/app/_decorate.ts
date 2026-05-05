import type { Edge as RFEdge, Node as RFNode } from "reactflow";
import type { Spec } from "../../../schema";
import { decorateForCompare, decorateForOnion } from "../diff-decorate";
import { viewerState } from "../../state";
import type { CompareMode } from "../CompareToolbar";

// Compose dim + diff decoration. When compareMode is "off" the live
// nodes/edges drive RF directly. In A-live we keep the live state and
// layer diff classes on top. In A-other we re-derive from the
// comparison spec and decorate against live; gesture handlers
// early-return so no save fires.
export function decorate(
  nodes: RFNode[],
  edges: RFEdge[],
  dimmed: Set<string> | null | undefined,
  comparisonSpec: Spec | null,
  compareMode: CompareMode,
  liveSpec: Spec | null,
): { nodes: RFNode[]; edges: RFEdge[] } {
  let baseNodes = nodes;
  let baseEdges = edges;
  if (comparisonSpec && (compareMode === "A-live" || compareMode === "A-other")) {
    const visible = compareMode === "A-live" ? liveSpec : comparisonSpec;
    const other = compareMode === "A-live" ? comparisonSpec : liveSpec;
    if (visible && other) {
      const decorated = decorateForCompare(visible, other, viewerState.folds ?? []);
      baseNodes = decorated.nodes;
      baseEdges = decorated.edges;
    }
  } else if (comparisonSpec && compareMode === "B-onion" && liveSpec) {
    const decorated = decorateForOnion(liveSpec, comparisonSpec, viewerState.folds ?? []);
    baseNodes = decorated.nodes;
    baseEdges = decorated.edges;
  }
  const styledNodes = dimmed
    ? baseNodes.map((n) => {
        const dimClass = dimmed.has(n.id) ? "" : "dim";
        if (!dimClass && !n.className) return n;
        const merged = [n.className, dimClass].filter(Boolean).join(" ");
        return { ...n, className: merged };
      })
    : baseNodes;
  const styledEdges = dimmed
    ? baseEdges.map((e) => {
        const dimClass = dimmed.has(e.source) && dimmed.has(e.target) ? "" : "dim";
        if (!dimClass && !e.className) return e;
        const merged = [e.className, dimClass].filter(Boolean).join(" ");
        return { ...e, className: merged };
      })
    : baseEdges;
  return { nodes: styledNodes, edges: styledEdges };
}
