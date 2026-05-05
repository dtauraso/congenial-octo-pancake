import type { Edge as RFEdge, Node as RFNode } from "reactflow";
import type { Edge as SpecEdge, EdgeKind, Node as SpecNode, Spec } from "../../../schema";

// Reverse of specToFlow: reconstruct a Spec from React Flow's node/edge
// state. Used by the round-trip contract test — any field that specToFlow
// drops on the way out and flowToSpec can't recover on the way back will
// cause the round-trip to diverge from the source spec.
export function flowToSpec(nodes: RFNode[], edges: RFEdge[]): Spec {
  // Fold nodes are viewer-only; note nodes are spec.notes[] (handled below).
  const specNodes: SpecNode[] = nodes
    .filter((n) => n.type !== "fold" && n.type !== "note")
    .map((n) => {
    const d = (n.data ?? {}) as {
      type?: string;
      sublabel?: string;
      state?: SpecNode["state"];
      props?: SpecNode["props"];
      spec?: SpecNode["spec"];
      notes?: SpecNode["notes"];
      nodeData?: SpecNode["data"];
    };
    return {
      id: n.id,
      type: d.type ?? "Generic",
      x: n.position.x,
      y: n.position.y,
      ...(d.sublabel !== undefined ? { sublabel: d.sublabel } : {}),
      ...(d.state !== undefined ? { state: d.state } : {}),
      ...(d.props !== undefined ? { props: d.props } : {}),
      ...(d.spec !== undefined ? { spec: d.spec } : {}),
      ...(d.notes !== undefined ? { notes: d.notes } : {}),
      ...(d.nodeData !== undefined ? { data: d.nodeData } : {}),
    };
  });

  const specEdges: SpecEdge[] = edges.map((e) => {
    const d = (e.data ?? {}) as {
      kind?: EdgeKind;
      sourceHandle?: string;
      targetHandle?: string;
      route?: SpecEdge["route"];
      lane?: number;
      arrowStyle?: SpecEdge["arrowStyle"];
      valueLabel?: string;
      label?: string;
      edgeData?: SpecEdge["data"];
    };
    return {
      id: e.id,
      source: e.source,
      sourceHandle: d.sourceHandle ?? "",
      target: e.target,
      targetHandle: d.targetHandle ?? "",
      kind: d.kind ?? "any",
      ...(typeof d.label === "string"
        ? { label: d.label }
        : typeof e.label === "string" ? { label: e.label } : {}),
      ...(d.valueLabel !== undefined ? { valueLabel: d.valueLabel } : {}),
      ...(d.route !== undefined ? { route: d.route } : {}),
      ...(d.lane !== undefined ? { lane: d.lane } : {}),
      ...(d.arrowStyle !== undefined ? { arrowStyle: d.arrowStyle } : {}),
      ...(d.edgeData !== undefined ? { data: d.edgeData } : {}),
    };
  });

  // Reassemble spec.notes[] from RF "note" nodes. Sort by `__note-N` suffix
  // so iteration order matches the original spec regardless of how RF
  // reordered them.
  const noteNodes = nodes
    .filter((n) => n.type === "note")
    .slice()
    .sort((a, b) => {
      const ai = parseInt(a.id.replace(/^__note-/, ""), 10);
      const bi = parseInt(b.id.replace(/^__note-/, ""), 10);
      return (Number.isFinite(ai) ? ai : 0) - (Number.isFinite(bi) ? bi : 0);
    });
  const specNotes = noteNodes.map((n) => {
    const d = (n.data ?? {}) as {
      text?: string;
      width?: number;
      height?: number;
      hasWidth?: boolean;
      hasHeight?: boolean;
    };
    return {
      x: n.position.x,
      y: n.position.y,
      ...(d.hasWidth ? { width: d.width } : {}),
      ...(d.hasHeight ? { height: d.height } : {}),
      text: d.text ?? "",
    };
  });

  const out: Spec = { nodes: specNodes, edges: specEdges };
  if (specNotes.length > 0) out.notes = specNotes;
  return out;
}
