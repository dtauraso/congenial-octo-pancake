// TopologyRoot: orchestrator. Validates the spec via parseSpec, builds
// stable wire/node refs, and binds each wire to its destination
// (destNodeRef + destSlotId) at construction.

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, type RefObject } from "react";
import { Wire, type WireHandle } from "./Wire";
import { type NodeHandle } from "./Node";
import { useHaltControl } from "./useHaltControl";
import { parseSpec, nodePorts, type RTopologySpec, type RNodeSpec } from "./spec";
import { renderKindBody } from "./node-kinds";

export interface TopologyRootHandle {
  node(id: string): NodeHandle | null;
}

export interface TopologyRootProps {
  spec: RTopologySpec;
  haltedOnMount?: boolean;
}

function findWireForOutput(
  spec: RTopologySpec, nodeId: string, port: string,
): string | undefined {
  return spec.wires.find((w) => w.source.nodeId === nodeId && w.source.port === port)?.id;
}

function NodeView({
  node, spec, nodeRef, wireRefs,
}: {
  node: RNodeSpec;
  spec: RTopologySpec;
  nodeRef: RefObject<NodeHandle | null>;
  wireRefs: Map<string, RefObject<WireHandle | null>>;
}) {
  const ports = nodePorts(node);
  const outWireRefs: Record<string, RefObject<WireHandle | null>> = {};
  for (const portName of ports.outputs) {
    const wireId = findWireForOutput(spec, node.id, portName);
    outWireRefs[portName] = wireId
      ? wireRefs.get(wireId)!
      : { current: null } as RefObject<WireHandle | null>;
  }
  return renderKindBody(node.kind, {
    nodeRef,
    outWireRefs,
    slotIds: ports.inputs,
    initialQueue: (node.props?.queue ?? []) as unknown[],
    seed: node.props?.seed,
    traceId: node.id,
  });
}

export const TopologyRoot = forwardRef<TopologyRootHandle, TopologyRootProps>(
function TopologyRoot({ spec, haltedOnMount }, ref) {
  const validated = useMemo(() => parseSpec(spec), [spec]);
  const wireRefsRef = useRef<Map<string, RefObject<WireHandle | null>>>(new Map());
  const nodeRefsRef = useRef<Map<string, RefObject<NodeHandle | null>>>(new Map());

  const wireRefs = useMemo(() => {
    const next = new Map<string, RefObject<WireHandle | null>>();
    for (const w of validated.wires) {
      next.set(w.id, wireRefsRef.current.get(w.id) ?? { current: null });
    }
    wireRefsRef.current = next;
    return next;
  }, [validated.wires]);

  const nodeRefs = useMemo(() => {
    const next = new Map<string, RefObject<NodeHandle | null>>();
    for (const n of validated.nodes) {
      next.set(n.id, nodeRefsRef.current.get(n.id) ?? { current: null });
    }
    nodeRefsRef.current = next;
    return next;
  }, [validated.nodes]);

  useImperativeHandle(ref, () => ({
    node: (id) => nodeRefs.get(id)?.current ?? null,
  }));

  const driver = useHaltControl();

  useEffect(() => {
    if (haltedOnMount) driver.halt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div data-testid="topology-root">
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={driver.halt} data-testid="halt">halt</button>
        <button onClick={driver.resume} data-testid="resume">resume</button>
        <span data-testid="halted">{driver.halted ? "halted" : "running"}</span>
      </div>
      <svg width={600} height={200} data-testid="topology-svg">
        {validated.wires.map((wire) => (
          <Wire
            key={`${wire.id}:${wire.target.nodeId}:${wire.target.port}:${wire.pathD}`}
            ref={wireRefs.get(wire.id)!}
            pathD={wire.pathD}
            arcLength={wire.arcLength}
            destNodeRef={nodeRefs.get(wire.target.nodeId)!}
            destSlotId={wire.target.port}
            pauseAxis={driver.pauseAxis}
            traceId={wire.id}
            value={wire.value}
          />
        ))}
      </svg>
      {validated.nodes.map((node) => (
        <NodeView
          key={node.id}
          node={node}
          spec={validated}
          nodeRef={nodeRefs.get(node.id)!}
          wireRefs={wireRefs}
        />
      ))}
    </div>
  );
});
