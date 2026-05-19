// React Flow node component backed by the new <Node> substrate
// primitive. Registers the node ref with SubstrateProvider, looks up
// connected wire refs via React Flow's edges store + registry, and
// mounts a node-kind body for Input or ReadGate.
//
// Visual fidelity: ports rendered as handles (one per data.inputs[i]
// and data.outputs[i]) tinted by KIND_COLORS; body uses data.fill /
// data.stroke / data.width / data.height per the spec's node-types.ts.

import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import { useStore, useUpdateNodeInternals, type NodeProps } from "reactflow";
import { shallow } from "zustand/shallow";
import type * as React from "react";
import type { EdgeKind } from "../../schema";
import type { NodeHandle } from "./Node";
import type { WireHandle } from "./Wire";
import { renderKindBody, isKindInert } from "./node-kinds";
import { useRegistry } from "./registry";
import { toRNodeKind } from "./spec";
import { postLog } from "../log/post";
import { PortRim } from "../rf/PortRim";
import { InputQueueEditor } from "./InputQueueEditor";

interface PortDef { name: string; kind: EdgeKind; side?: "left" | "right" | "top" | "bottom"; slot?: 0 | 1 | 2 }

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
  nodeData?: { init?: unknown[]; initialSlots?: Record<string, unknown>; repeat?: boolean };
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
  const isInert = kind ? isKindInert(kind, outWireRefs) : false;
  const updateNodeInternals = useUpdateNodeInternals();
  const onHeightChange = useCallback(() => updateNodeInternals(id), [id, updateNodeInternals]);

  return (
    <div
      className={isInert ? "r-substrate-node--inert" : undefined}
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
      <PortRim nodeId={id} inputs={inputs} outputs={outputs} width={width} height={height} />
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontWeight: 500 }}>{data?.label ?? id}</span>
        {kind && renderKindBody(kind, {
          nodeRef,
          outWireRefs,
          slotIds: inputs.map((p) => p.name),
          initialQueue: data?.nodeData?.init ?? [],
          initialSlots: data?.nodeData?.initialSlots,
          repeat: data?.nodeData?.repeat,
          traceId: id,
        })}
      </div>
      {data?.sublabel && <div style={{ fontSize: 9, opacity: 0.7 }}>{data.sublabel}</div>}
      {kind === "input" && (
        <InputQueueEditor
          nodeId={id}
          initialQueue={data?.nodeData?.init ?? []}
          onHeightChange={onHeightChange}
        />
      )}
    </div>
  );
}
