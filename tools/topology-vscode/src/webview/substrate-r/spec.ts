// RTopologySpec: minimal spec shape for the substrate. Independent of
// the editor's persistence format; an adapter projects the editor's
// full spec into this shape.
//
// Slot ids are declared per kind in NODE_KIND_PORTS and validated at
// parse time — a wire whose target.port does not name a slot on its
// destination kind is rejected here, not at runtime.

export type RNodeKind = "input" | "relay" | "join" | "readgate";

export interface RNodeSpec {
  id: string;
  kind: RNodeKind;
  props?: { queue?: unknown[] };
}

export interface RWireSpec {
  id: string;
  source: { nodeId: string; port: string };
  target: { nodeId: string; port: string };
  pathD: string;
  arcLength: number;
  // Assigned by parseSpec: cohort = max(predecessor cohorts) + 1,
  // 0 for wires whose source node has no incoming wires.
  cohort?: number;
}

export interface RTopologySpec {
  nodes: RNodeSpec[];
  wires: RWireSpec[];
}

export interface KindPorts { inputs: string[]; outputs: string[] }

export const NODE_KIND_PORTS: Record<RNodeKind, KindPorts> = {
  input:    { inputs: [],      outputs: ["out"] },
  relay:    { inputs: ["in0"], outputs: ["out"] },
  join:     { inputs: ["a", "b"], outputs: ["out"] },
  readgate: { inputs: ["in0"], outputs: [] },
};

export function parseSpec(spec: RTopologySpec): RTopologySpec {
  const byId = new Map<string, RNodeSpec>();
  for (const n of spec.nodes) {
    if (byId.has(n.id)) throw new Error(`parseSpec: duplicate node id ${n.id}`);
    byId.set(n.id, n);
  }
  for (const w of spec.wires) {
    const dest = byId.get(w.target.nodeId);
    if (!dest) throw new Error(`parseSpec: wire ${w.id} targets unknown node ${w.target.nodeId}`);
    const src = byId.get(w.source.nodeId);
    if (!src) throw new Error(`parseSpec: wire ${w.id} sourced from unknown node ${w.source.nodeId}`);
    const destPorts = NODE_KIND_PORTS[dest.kind];
    if (!destPorts.inputs.includes(w.target.port)) {
      throw new Error(
        `parseSpec: wire ${w.id} target port "${w.target.port}" is not a slot on ${dest.kind} (${dest.id})`,
      );
    }
    const srcPorts = NODE_KIND_PORTS[src.kind];
    if (!srcPorts.outputs.includes(w.source.port)) {
      throw new Error(
        `parseSpec: wire ${w.id} source port "${w.source.port}" is not an output on ${src.kind} (${src.id})`,
      );
    }
  }
  assignCohorts(spec);
  return spec;
}

function assignCohorts(spec: RTopologySpec): void {
  const incomingByNode = new Map<string, RWireSpec[]>();
  for (const w of spec.wires) {
    const list = incomingByNode.get(w.target.nodeId) ?? [];
    list.push(w);
    incomingByNode.set(w.target.nodeId, list);
  }
  const cohort = new Map<string, number>();
  const visiting = new Set<string>();
  const wireById = new Map(spec.wires.map((w) => [w.id, w]));
  const visit = (w: RWireSpec): number => {
    const cached = cohort.get(w.id);
    if (cached !== undefined) return cached;
    if (visiting.has(w.id)) {
      throw new Error(`parseSpec: cycle detected at wire ${w.id}`);
    }
    visiting.add(w.id);
    const preds = incomingByNode.get(w.source.nodeId) ?? [];
    const c = preds.length === 0 ? 0 : Math.max(...preds.map(visit)) + 1;
    visiting.delete(w.id);
    cohort.set(w.id, c);
    return c;
  };
  for (const w of spec.wires) {
    w.cohort = visit(wireById.get(w.id)!);
  }
}
