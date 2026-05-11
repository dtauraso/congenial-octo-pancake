// React Flow node component backed by the new <Node> substrate
// primitive. Registers the node ref with SubstrateProvider, looks up
// connected wire refs via React Flow's edges store + registry, and
// mounts a node-kind body for Input or ReadGate.
//
// Visual fidelity: ports rendered as handles (one per data.inputs[i]
// and data.outputs[i]) tinted by KIND_COLORS; body uses data.fill /
// data.stroke / data.width / data.height per the spec's node-types.ts.

import { useEffect, useMemo, useRef } from "react";
import { Handle, Position, useStore, type NodeProps } from "reactflow";
import { KIND_COLORS, type EdgeKind } from "../../schema";
import type { NodeHandle } from "./Node";
import type { WireHandle } from "./Wire";
import { InputBody, ReadGateBody } from "./node-kinds";
import { useRegistry } from "./registry";

interface PortDef { name: string; kind: EdgeKind }

interface RSubstrateNodeData {
  type?: string;
  label?: string;
  sublabel?: string;
  fill?: string;
  stroke?: string;
  shape?: "rect" | "pill";
  width?: number;
  height?: number;
  inputs?: PortDef[];
  outputs?: PortDef[];
  nodeData?: { init?: unknown[] };
}

function handleStyle(side: "left" | "right", pct: number, color: string): React.CSSProperties {
  return {
    [side]: -5,
    top: `${pct}%`,
    width: 8,
    height: 8,
    background: color,
    border: "1px solid #333",
  } as React.CSSProperties;
}

export function RSubstrateNode(props: NodeProps<RSubstrateNodeData>) {
  const { id, data, selected } = props;
  const kind = (data?.type ?? "").toLowerCase();
  const nodeRef = useRef<NodeHandle | null>(null);
  const registry = useRegistry();

  useEffect(() => registry.registerNode(id, nodeRef), [id, registry]);

  const inputs = data?.inputs ?? [];
  const outputs = data?.outputs ?? [];
  const firstInputPort = inputs[0]?.name;
  const firstOutputPort = outputs[0]?.name;

  // Look up incoming/outgoing edge ids from React Flow's store.
  const inWireId = useStore((s) => firstInputPort
    ? s.edges.find((e) => e.target === id && e.targetHandle === firstInputPort)?.id
    : undefined);
  const outWireId = useStore((s) => firstOutputPort
    ? s.edges.find((e) => e.source === id && e.sourceHandle === firstOutputPort)?.id
    : undefined);

  const NULL_REF = useMemo<{ current: WireHandle | null }>(() => ({ current: null }), []);
  const inWireRef = inWireId ? (registry.getWireRef(inWireId) ?? NULL_REF) : NULL_REF;
  const outWireRef = outWireId ? (registry.getWireRef(outWireId) ?? NULL_REF) : NULL_REF;

  const width = data?.width ?? 90;
  const height = data?.height ?? 50;
  const radius = data?.shape === "pill" ? height / 2 : 4;

  return (
    <div
      style={{
        position: "relative",
        minWidth: width,
        width: "max-content",
        height,
        background: data?.fill ?? "#ffffff",
        color: "#1a1a1a",
        border: `${selected ? 2 : 1}px solid ${data?.stroke ?? "#888"}`,
        borderRadius: radius,
        fontSize: 11,
        padding: "4px 8px",
        boxSizing: "border-box",
      }}
    >
      {inputs.map((p, i) => (
        <Handle
          key={`in-${p.name}`}
          id={p.name}
          type="target"
          position={Position.Left}
          style={handleStyle("left", ((i + 1) * 100) / (inputs.length + 1), KIND_COLORS[p.kind] ?? "#888")}
        />
      ))}
      {outputs.map((p, i) => (
        <Handle
          key={`out-${p.name}`}
          id={p.name}
          type="source"
          position={Position.Right}
          style={handleStyle("right", ((i + 1) * 100) / (outputs.length + 1), KIND_COLORS[p.kind] ?? "#888")}
        />
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontWeight: 500 }}>{data?.label ?? id}</span>
        {kind === "input" && (
          <InputBody
            nodeRef={nodeRef}
            outWireRef={outWireRef}
            initialQueue={data?.nodeData?.init ?? []}
          />
        )}
        {kind === "readgate" && (
          <ReadGateBody nodeRef={nodeRef} inWireRef={inWireRef} />
        )}
      </div>
      {data?.sublabel && <div style={{ fontSize: 9, opacity: 0.7 }}>{data.sublabel}</div>}
    </div>
  );
}
