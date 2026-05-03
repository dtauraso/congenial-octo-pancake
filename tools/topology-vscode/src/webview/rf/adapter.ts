import type { Edge as RFEdge, Node as RFNode } from "reactflow";
import {
  KIND_COLORS,
  NODE_TYPES,
  type Edge as SpecEdge,
  type EdgeKind,
  type Node as SpecNode,
  type Spec,
  type StateValue,
} from "../../schema";

export function specToFlow(spec: Spec): { nodes: RFNode[]; edges: RFEdge[] } {
  const fireTimes = new Map<string, number[]>();
  // stateSegs: nodeId -> field -> [{t, v}, ...] (sorted by t).
  const stateSegs = new Map<string, Map<string, { t: number; v: StateValue }[]>>();

  // Seed initial state from each node.state at t=0.
  for (const n of spec.nodes) {
    if (!n.state) continue;
    const fields = new Map<string, { t: number; v: StateValue }[]>();
    for (const [f, v] of Object.entries(n.state)) {
      fields.set(f, [{ t: 0, v }]);
    }
    stateSegs.set(n.id, fields);
  }

  for (const s of spec.timing?.steps ?? []) {
    if (s.fires) for (const id of s.fires) {
      const arr = fireTimes.get(id) ?? [];
      arr.push(s.t);
      fireTimes.set(id, arr);
    }
    if (s.state) {
      for (const [nodeId, fieldMap] of Object.entries(s.state)) {
        let nodeFields = stateSegs.get(nodeId);
        if (!nodeFields) { nodeFields = new Map(); stateSegs.set(nodeId, nodeFields); }
        for (const [field, value] of Object.entries(fieldMap)) {
          const segs = nodeFields.get(field) ?? [];
          segs.push({ t: s.t, v: value });
          nodeFields.set(field, segs);
        }
      }
    }
  }

  const nodes: RFNode[] = spec.nodes.map((n) => {
    const def = NODE_TYPES[n.type];
    const width = def?.width ?? 110;
    const height = def?.height ?? 60;
    const ft = fireTimes.get(n.id);
    const fieldsMap = stateSegs.get(n.id);
    const stateFields = fieldsMap
      ? Array.from(fieldsMap.entries()).map(([field, segs]) => ({
          field,
          segments: [...segs].sort((a, b) => a.t - b.t),
        }))
      : undefined;
    return {
      id: n.id,
      type: "animated",
      position: { x: n.x, y: n.y },
      data: {
        label: n.id,
        sublabel: n.sublabel,
        type: n.type,
        fill: def?.fill ?? "#ffffff",
        stroke: def?.stroke ?? "#888",
        shape: def?.shape ?? "rect",
        width,
        height,
        fireTimes: ft,
        stateFields,
        inputs: def?.inputs ?? [],
        outputs: def?.outputs ?? [],
      },
    };
  });

  const departAt = new Map<string, number>();
  const arriveAt = new Map<string, number>();
  for (const s of spec.timing?.steps ?? []) {
    for (const id of s.departs ?? []) departAt.set(id, s.t);
    for (const id of s.arrives ?? []) arriveAt.set(id, s.t);
  }

  const edges: RFEdge[] = spec.edges.map((e) => {
    const td = departAt.get(e.id);
    const ta = arriveAt.get(e.id);
    const pulse = td !== undefined && ta !== undefined && ta > td ? { td, ta } : undefined;
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      type: "animated",
      label: e.label,
      style: { stroke: KIND_COLORS[e.kind] ?? "#888", strokeWidth: 1.5 },
      data: { kind: e.kind, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle, pulse },
    };
  });

  return { nodes, edges };
}

// Reverse of specToFlow: reconstruct a Spec from React Flow's node/edge
// state. Used by the round-trip contract test — any field that specToFlow
// drops on the way out and flowToSpec can't recover on the way back will
// cause the round-trip to diverge from the source spec, which is the
// signal we want.
export function flowToSpec(nodes: RFNode[], edges: RFEdge[]): Spec {
  const specNodes: SpecNode[] = nodes.map((n) => {
    const d = (n.data ?? {}) as { type?: string; sublabel?: string };
    return {
      id: n.id,
      type: d.type ?? "Generic",
      x: n.position.x,
      y: n.position.y,
      ...(d.sublabel !== undefined ? { sublabel: d.sublabel } : {}),
    };
  });

  const specEdges: SpecEdge[] = edges.map((e) => {
    const d = (e.data ?? {}) as {
      kind?: EdgeKind;
      sourceHandle?: string;
      targetHandle?: string;
    };
    return {
      id: e.id,
      source: e.source,
      sourceHandle: d.sourceHandle ?? "",
      target: e.target,
      targetHandle: d.targetHandle ?? "",
      kind: d.kind ?? "any",
      ...(typeof e.label === "string" ? { label: e.label } : {}),
    };
  });

  return { nodes: specNodes, edges: specEdges };
}
