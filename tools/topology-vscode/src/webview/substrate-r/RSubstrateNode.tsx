// React Flow node component backed by the new <Node> substrate
// primitive. Registers the node ref with SubstrateProvider; mounts
// Input or ReadGate body based on the node type. Looks up the
// connected wire ref via the registry by edge id (found by querying
// React Flow's edges store).
//
// Replaces AnimatedNode. Does not read frame-store; phase observations
// happen via the registry's wire refs.

import { useEffect, useMemo, useRef } from "react";
import { Handle, Position, useStore, type NodeProps } from "reactflow";
import type { NodeHandle } from "./Node";
import type { WireHandle } from "./Wire";
import { InputBody, ReadGateBody } from "./node-kinds";
import { useRegistry } from "./registry";

interface RSubstrateNodeData {
  type?: string;
  label?: string;
  initialQueue?: unknown[];
  inputs?: { name: string }[];
  outputs?: { name: string }[];
}

export function RSubstrateNode(props: NodeProps<RSubstrateNodeData>) {
  const { id, data } = props;
  const kind = (data?.type ?? "").toLowerCase();
  const nodeRef = useRef<NodeHandle | null>(null);
  const registry = useRegistry();

  useEffect(
    () => registry.registerNode(id, nodeRef),
    [id, registry],
  );

  // Find the incoming edge for "in0" (for ReadGate) and the outgoing
  // edge for "out" (for Input) via React Flow's store.
  const inWireId = useStore((s) => {
    const e = s.edges.find(
      (e) => e.target === id && (e.targetHandle ?? "in0") === "in0",
    );
    return e?.id;
  });
  const outWireId = useStore((s) => {
    const e = s.edges.find(
      (e) => e.source === id && (e.sourceHandle ?? "out") === "out",
    );
    return e?.id;
  });

  const NULL_REF = useMemo<{ current: WireHandle | null }>(() => ({ current: null }), []);
  const inWireRef = inWireId ? (registry.getWireRef(inWireId) ?? NULL_REF) : NULL_REF;
  const outWireRef = outWireId ? (registry.getWireRef(outWireId) ?? NULL_REF) : NULL_REF;

  return (
    <div
      style={{
        position: "relative", minWidth: 80, padding: "4px 8px",
        background: "#eee", color: "#1a1a1a",
        border: "1px solid #666", borderRadius: 4, fontSize: 11,
      }}
    >
      <Handle type="target" position={Position.Left} id="in0" isConnectable />
      <Handle type="source" position={Position.Right} id="out" isConnectable />
      <div style={{ marginBottom: 2 }}>{data?.label ?? id}</div>
      <svg width={80} height={20} style={{ overflow: "visible" }}>
        {kind === "input" && (
          <InputBody
            nodeRef={nodeRef}
            outWireRef={outWireRef}
            initialQueue={data?.initialQueue ?? []}
          />
        )}
        {kind === "readgate" && (
          <ReadGateBody nodeRef={nodeRef} inWireRef={inWireRef} />
        )}
      </svg>
    </div>
  );
}
