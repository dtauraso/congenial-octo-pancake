// RTopologySpec: minimal spec shape for the substrate. Independent of
// the editor's persistence format; an adapter projects the editor's
// full spec into this shape.
//
// Slot ids are declared per kind in NODE_KIND_PORTS and validated at
// parse time — a wire whose target.port does not name a slot on its
// destination kind is rejected here, not at runtime.

export type RNodeKind = "input" | "relay" | "join" | "readgate" | "chainInhibitor" | "inhibitrightgate" | "register";

// Canonical kind id form is lowercase. Editor schema (schema/node-types.ts)
// uses PascalCase for human-readable type labels; toRNodeKind narrows a
// possibly-PascalCase string from React Flow node.data into the runtime
// kind enum or `undefined` if not a substrate-implemented kind.
export function toRNodeKind(s: string | undefined): RNodeKind | undefined {
  switch ((s ?? "").toLowerCase()) {
    case "input": return "input";
    case "relay": return "relay";
    case "join": return "join";
    case "readgate": return "readgate";
    case "chaininhibitor": return "chainInhibitor";
    case "inhibitrightgate": return "inhibitrightgate";
    case "register": return "register";
    default: return undefined;
  }
}

export interface RNodeSpec {
  id: string;
  kind: RNodeKind;
  props?: { queue?: unknown[] };
  // Per-node override of NODE_KIND_PORTS. Lets a spec declare e.g. a
  // readgate whose input slot is "value" rather than "slot",
  // matching what the editor schema can produce. Arity must match the
  // kind's defaults; only the names change.
  ports?: { inputs?: string[]; outputs?: string[] };
}

export function nodePorts(node: RNodeSpec): KindPorts {
  const defaults = NODE_KIND_PORTS[node.kind];
  const inputs = node.ports?.inputs ?? defaults.inputs;
  const outputs = node.ports?.outputs ?? defaults.outputs;
  // readgate is variable-arity (AND over N input slots, N >= 1). All
  // other kinds enforce fixed arity matching their defaults.
  if (node.kind === "readgate") {
    if (inputs.length < 1) {
      throw new Error(`nodePorts: ${node.id} (readgate) needs at least one input slot`);
    }
    // readgate outputs are variable-arity (0..N): the gate releases
    // by firing rule, and instances may declare an output port to
    // close a feedback cycle back into the chain.
  } else {
    if (inputs.length !== defaults.inputs.length) {
      throw new Error(`nodePorts: ${node.id} (${node.kind}) input arity ${inputs.length} ≠ ${defaults.inputs.length}`);
    }
    if (outputs.length !== defaults.outputs.length) {
      throw new Error(`nodePorts: ${node.id} (${node.kind}) output arity ${outputs.length} ≠ ${defaults.outputs.length}`);
    }
  }
  return { inputs, outputs };
}

export interface RWireSpec {
  id: string;
  source: { nodeId: string; port: string };
  target: { nodeId: string; port: string };
  pathD: string;
  arcLength: number;
  value?: unknown;
}

export interface RTopologySpec {
  nodes: RNodeSpec[];
  wires: RWireSpec[];
}

export interface KindPorts { inputs: string[]; outputs: string[] }

export const NODE_KIND_PORTS: Record<RNodeKind, KindPorts> = {
  input:    { inputs: [],      outputs: ["out"] },
  relay:    { inputs: ["slot"], outputs: ["out"] },
  join:     { inputs: ["a", "b"], outputs: ["out"] },
  readgate: { inputs: ["slot"], outputs: [] },
  chainInhibitor: { inputs: ["in"], outputs: ["inhibitOut", "out"] },
  inhibitrightgate: { inputs: ["left", "right"], outputs: ["out"] },
  register: { inputs: ["slot"], outputs: ["out"] },
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
    const destPorts = nodePorts(dest);
    if (!destPorts.inputs.includes(w.target.port)) {
      throw new Error(
        `parseSpec: wire ${w.id} target port "${w.target.port}" is not a slot on ${dest.kind} (${dest.id})`,
      );
    }
    const srcPorts = nodePorts(src);
    if (!srcPorts.outputs.includes(w.source.port)) {
      throw new Error(
        `parseSpec: wire ${w.id} source port "${w.source.port}" is not an output on ${src.kind} (${src.id})`,
      );
    }
  }
  return spec;
}
