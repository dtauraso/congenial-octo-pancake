import { Handle, Position, NodeProps } from "reactflow";
import { NODE_TYPES, KIND_COLORS, Port } from "./schema";

export type TopologyNodeData = {
  type: keyof typeof NODE_TYPES;
  label?: string;
  index?: number;
  // Per-instance port overrides (used by Generic nodes).
  inputs?: Port[];
  outputs?: Port[];
  // Pre-loaded values for nodes with an external input channel (e.g. Input).
  init?: number[];
};

export function effectivePorts(data: TopologyNodeData): { inputs: Port[]; outputs: Port[] } {
  const def = NODE_TYPES[data.type];
  return {
    inputs: data.inputs ?? def?.inputs ?? [],
    outputs: data.outputs ?? def?.outputs ?? [],
  };
}

export function TopologyNode({ data, selected }: NodeProps<TopologyNodeData>) {
  const def = NODE_TYPES[data.type];
  if (!def) return <div style={{ color: "red" }}>unknown: {data.type}</div>;

  const { width, height, fill, stroke, shape } = def;
  const { inputs, outputs } = effectivePorts(data);
  const radius = shape === "pill" ? height / 2 : 6;
  const label = data.label ?? data.type + (data.index !== undefined ? data.index : "");

  return (
    <div style={{ position: "relative", width, height }}>
      <div
        style={{
          width, height,
          background: fill,
          border: `${selected ? 3 : 2}px solid ${stroke}`,
          borderRadius: radius,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, color: stroke, fontWeight: 300,
          textAlign: "center", padding: "0 4px",
          boxSizing: "border-box",
        }}
      >
        <div>
          <div style={{ fontWeight: 400 }}>{label}</div>
          <div style={{ fontSize: 9, opacity: 0.7 }}>{def.role}</div>
        </div>
      </div>
      {inputs.map((p, i) => (
        <Handle
          key={"in-" + p.name}
          type="target"
          position={Position.Left}
          id={p.name}
          style={{
            top: ((i + 1) * height) / (inputs.length + 1),
            background: KIND_COLORS[p.kind],
            width: 10, height: 10,
          }}
          title={`${p.name} : ${p.kind}`}
        />
      ))}
      {outputs.map((p, i) => (
        <Handle
          key={"out-" + p.name}
          type="source"
          position={Position.Right}
          id={p.name}
          style={{
            top: ((i + 1) * height) / (outputs.length + 1),
            background: KIND_COLORS[p.kind],
            width: 10, height: 10,
          }}
          title={`${p.name} : ${p.kind}`}
        />
      ))}
    </div>
  );
}
