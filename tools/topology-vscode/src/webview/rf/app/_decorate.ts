import type { Edge as RFEdge, Node as RFNode } from "reactflow";

// Compose dim decoration. Nodes/edges not in the dimmed set get a "dim" class.
export function decorate(
  nodes: RFNode[],
  edges: RFEdge[],
  dimmed: Set<string> | null | undefined,
): { nodes: RFNode[]; edges: RFEdge[] } {
  if (!dimmed) return { nodes, edges };
  const styledNodes = nodes.map((n) => {
    const dimClass = dimmed.has(n.id) ? "" : "dim";
    if (!dimClass && !n.className) return n;
    const merged = [n.className, dimClass].filter(Boolean).join(" ");
    return { ...n, className: merged };
  });
  const styledEdges = edges.map((e) => {
    const dimClass = dimmed.has(e.source) && dimmed.has(e.target) ? "" : "dim";
    if (!dimClass && !e.className) return e;
    const merged = [e.className, dimClass].filter(Boolean).join(" ");
    return { ...e, className: merged };
  });
  return { nodes: styledNodes, edges: styledEdges };
}
