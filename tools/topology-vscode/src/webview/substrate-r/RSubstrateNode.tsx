// React Flow node component backed by the new <Node> substrate
// primitive. Registers the node ref with SubstrateProvider, looks up
// connected wire refs via React Flow's edges store + registry, and
// mounts a node-kind body for Input or ReadGate.
//
// Visual fidelity: ports rendered as handles (one per data.inputs[i]
// and data.outputs[i]) tinted by KIND_COLORS; body uses data.fill /
// data.stroke / data.width / data.height per the spec's node-types.ts.

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Handle, Position, useStore, type NodeProps } from "reactflow";
import { shallow } from "zustand/shallow";
import type * as React from "react";
import { KIND_COLORS, type EdgeKind } from "../../schema";
import type { NodeHandle } from "./Node";
import type { WireHandle } from "./Wire";
import { renderKindBody } from "./node-kinds";
import { useRegistry } from "./registry";
import { toRNodeKind } from "./spec";
import { postLog } from "../log/post";

interface PortDef { name: string; kind: EdgeKind; side?: "left" | "right" }

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
  const kind = toRNodeKind(data?.type);
  const nodeRef = useRef<NodeHandle | null>(null);
  const registry = useRegistry();

  useEffect(() => registry.registerNode(id, nodeRef), [id, registry]);

  const inputs = data?.inputs ?? [];
  const outputs = data?.outputs ?? [];

  // One useStore call returns a map of portName → edgeId for all outputs.
  const outputEdgeIds = useStore((s) => {
    const result: Record<string, string | undefined> = {};
    for (const port of outputs) {
      result[port.name] = s.edges.find(
        (e) => e.source === id && e.sourceHandle === port.name
      )?.id;
    }
    return result;
  }, shallow);

  const NULL_REF = useMemo<{ current: WireHandle | null }>(() => ({ current: null }), []);
  const outWireRefs: Record<string, RefObject<WireHandle | null>> = {};
  for (const port of outputs) {
    const edgeId = outputEdgeIds[port.name];
    const wireRef = edgeId ? (registry.getWireRef(edgeId) ?? NULL_REF) : NULL_REF;
    postLog("trace.wireref.resolve", {
      nodeId: id,
      portName: port.name,
      edgeId: edgeId ?? null,
      hasRef: wireRef !== NULL_REF,
    });
    outWireRefs[port.name] = wireRef;
  }

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
      {(() => {
        const leftIns = inputs.filter((p) => (p.side ?? "left") === "left");
        const rightIns = inputs.filter((p) => p.side === "right");
        const leftOuts = outputs.filter((p) => p.side === "left");
        const rightOuts = outputs.filter((p) => (p.side ?? "right") === "right");
        const leftPorts = [...leftIns, ...leftOuts];
        const rightPorts = [...rightIns, ...rightOuts];
        return (
          <>
            {leftPorts.map((p, i) => (
              <Handle
                key={`l-${p.name}`}
                id={p.name}
                type={inputs.includes(p) ? "target" : "source"}
                position={Position.Left}
                style={handleStyle("left", ((i + 1) * 100) / (leftPorts.length + 1), KIND_COLORS[p.kind] ?? "#888")}
              />
            ))}
            {rightPorts.map((p, i) => (
              <Handle
                key={`r-${p.name}`}
                id={p.name}
                type={inputs.includes(p) ? "target" : "source"}
                position={Position.Right}
                style={handleStyle("right", ((i + 1) * 100) / (rightPorts.length + 1), KIND_COLORS[p.kind] ?? "#888")}
              />
            ))}
          </>
        );
      })()}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontWeight: 500 }}>{data?.label ?? id}</span>
        {kind && renderKindBody(kind, {
          nodeRef,
          outWireRefs,
          slotIds: inputs.map((p) => p.name),
          initialQueue: data?.nodeData?.init ?? [],
          traceId: id,
        })}
      </div>
      {data?.sublabel && <div style={{ fontSize: 9, opacity: 0.7 }}>{data.sublabel}</div>}
    </div>
  );
}
