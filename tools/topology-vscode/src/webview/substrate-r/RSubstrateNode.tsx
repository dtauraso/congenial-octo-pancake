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
import type * as React from "react";
import { KIND_COLORS, type EdgeKind } from "../../schema";
import type { NodeHandle } from "./Node";
import type { WireHandle } from "./Wire";
import { InputBody, ReadGateBody, RelayBody, JoinBody, ChainInhibitorBody } from "./node-kinds";
import { useRegistry } from "./registry";
import { toRNodeKind, type RNodeKind } from "./spec";

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

interface BodyRenderCtx {
  nodeRef: React.RefObject<NodeHandle | null>;
  outWireRef: React.RefObject<WireHandle | null>;
  inputs: PortDef[];
  initialQueue: unknown[];
}

// Exhaustive switch on the validated RNodeKind. Mirror any new RNodeKind
// here AND in TopologyRoot.tsx — `never` check below makes a missing case
// a compile error so the editor path can't silently rot.
function renderBodyFor(kind: RNodeKind | undefined, ctx: BodyRenderCtx): React.ReactNode {
  if (!kind) return null;
  const { nodeRef, outWireRef, inputs, initialQueue } = ctx;
  switch (kind) {
    case "input":
      return <InputBody nodeRef={nodeRef} outWireRef={outWireRef} initialQueue={initialQueue} />;
    case "relay":
      return <RelayBody nodeRef={nodeRef} outWireRef={outWireRef} slotId={inputs[0]?.name} />;
    case "chaininhibitor":
      return <ChainInhibitorBody nodeRef={nodeRef} outWireRef={outWireRef} slotId={inputs[0]?.name} />;
    case "join":
      return <JoinBody nodeRef={nodeRef} outWireRef={outWireRef} slotAId={inputs[0]?.name} slotBId={inputs[1]?.name} />;
    case "readgate":
      return <ReadGateBody nodeRef={nodeRef} slotIds={inputs.map((p) => p.name)} outWireRef={outWireRef} />;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
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
  const firstOutputPort = outputs[0]?.name;

  // Look up outgoing edge id from React Flow's store.
  const outWireId = useStore((s) => firstOutputPort
    ? s.edges.find((e) => e.source === id && e.sourceHandle === firstOutputPort)?.id
    : undefined);

  const NULL_REF = useMemo<{ current: WireHandle | null }>(() => ({ current: null }), []);
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
        {renderBodyFor(kind, { nodeRef, outWireRef, inputs, initialQueue: data?.nodeData?.init ?? [] })}
      </div>
      {data?.sublabel && <div style={{ fontSize: 9, opacity: 0.7 }}>{data.sublabel}</div>}
    </div>
  );
}
