import { KIND_COLORS, type Spec } from "../../schema";

// Map outgoing edge ids to their kind color for a given node. The inline
// spec panel uses this to resolve {outputRef: edgeId} segments — renaming
// or rekinding an edge recolors the prose automatically because resolution
// runs against the live spec, not a frozen color value.
export function outgoingEdgeColors(spec: Spec, nodeId: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const e of spec.edges) {
    if (e.source === nodeId) out.set(e.id, KIND_COLORS[e.kind] ?? "#888");
  }
  return out;
}
