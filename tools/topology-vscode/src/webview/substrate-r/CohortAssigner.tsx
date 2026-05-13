// Watches React Flow's edge set and pushes a wireId → cohort map into
// the substrate registry. Mounted as a child of ReactFlow so it can
// read the store. Without this, RSubstrateEdge defaults every wire to
// cohort 0 and the driver's cohort axis is dead.

import { useEffect } from "react";
import { useStore } from "reactflow";
import { useRegistry } from "./registry";
import { assignCohortsForEdges } from "./cohort-assign";

export function CohortAssigner() {
  const edges = useStore((s) => s.edges);
  const registry = useRegistry();
  useEffect(() => {
    const map = assignCohortsForEdges(
      edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    );
    registry.setCohorts(map);
  }, [edges, registry]);
  return null;
}
