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

interface PortDef { name: string; kind: EdgeKind; side?: "left" | "right" | "top" | "bottom" }

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
  nodeData?: { init?: unknown[]; seed?: unknown };
}

function handleStyle(side: "left" | "right" | "top" | "bottom", pct: number, color: string): React.CSSProperties {
  const isVertical = side === "left" || side === "right";
  return {
    [side]: -5,
    ...(isVertical ? { top: `${pct}%` } : { left: `${pct}%` }),
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
  const resolvedPorts: Array<{ portName: string; edgeId: string | null; hasRef: boolean }> = [];
  for (const port of outputs) {
    const edgeId = outputEdgeIds[port.name];
    const wireRef = edgeId ? (registry.getWireRef(edgeId) ?? NULL_REF) : NULL_REF;
    resolvedPorts.push({ portName: port.name, edgeId: edgeId ?? null, hasRef: wireRef !== NULL_REF });
    outWireRefs[port.name] = wireRef;
  }

  const lastLoggedRef = useRef<Record<string, string>>({});
  useEffect(() => {
    for (const r of resolvedPorts) {
      const key = `${r.portName}`;
      const sig = `${r.edgeId ?? ""}|${r.hasRef}`;
      if (lastLoggedRef.current[key] === sig) continue;
      // Skip transient "lost ref" pings — registry returns NULL_REF for one
      // render between renders. Only log the resolved (hasRef:true) state and
      // edgeId changes; absent edges still log once at hasRef:false.
      const prevSig = lastLoggedRef.current[key];
      const prevEdge = prevSig?.split("|")[0] ?? "";
      const edgeChanged = prevEdge !== (r.edgeId ?? "");
      if (!r.hasRef && !edgeChanged && prevSig !== undefined) continue;
      lastLoggedRef.current[key] = sig;
      postLog("trace.wireref.resolve", {
        nodeId: id,
        portName: r.portName,
        edgeId: r.edgeId,
        hasRef: r.hasRef,
      });
    }
  });

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
        type Side = "left" | "right" | "top" | "bottom";
        const buckets: Record<Side, PortDef[]> = { left: [], right: [], top: [], bottom: [] };
        for (const p of inputs) {
          const s: Side = (p.side as Side) ?? "left";
          buckets[s].push(p);
        }
        for (const p of outputs) {
          const s: Side = (p.side as Side) ?? "right";
          buckets[s].push(p);
        }
        const sidePosition: Record<Side, Position> = {
          left: Position.Left,
          right: Position.Right,
          top: Position.Top,
          bottom: Position.Bottom,
        };
        const keyPrefix: Record<Side, string> = { left: "l-", right: "r-", top: "t-", bottom: "b-" };
        return (
          <>
            {(["left", "right", "top", "bottom"] as Side[]).flatMap((side) =>
              buckets[side].map((p, i, arr) => (
                <Handle
                  key={`${keyPrefix[side]}${p.name}`}
                  id={p.name}
                  type={inputs.includes(p) ? "target" : "source"}
                  position={sidePosition[side]}
                  style={handleStyle(side, ((i + 1) * 100) / (arr.length + 1), KIND_COLORS[p.kind] ?? "#888")}
                />
              ))
            )}
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
          seed: data?.nodeData?.seed,
          traceId: id,
        })}
      </div>
      {data?.sublabel && <div style={{ fontSize: 9, opacity: 0.7 }}>{data.sublabel}</div>}
    </div>
  );
}
