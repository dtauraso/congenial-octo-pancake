// TopologyRoot: orchestrator. Validates the spec via parseSpec, builds
// stable wire/node refs, binds each wire to its destination
// (destNodeRef + destSlotId) at construction, and runs the tick
// driver across them.

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Wire, type WireHandle } from "./Wire";
import { type NodeHandle } from "./Node";
import { useTickDriver } from "./useTickDriver";
import { parseSpec, nodePorts, type RTopologySpec, type RNodeSpec } from "./spec";
import { InputBody, RelayBody, JoinBody, ReadGateBody, ChainInhibitorBody } from "./node-kinds";

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
  const outPort = ports.outputs[0];
  const outWireId = outPort ? findWireForOutput(spec, node.id, outPort) : undefined;
  const outWireRef = outWireId
    ? wireRefs.get(outWireId)!
    : { current: null } as RefObject<WireHandle | null>;
  if (node.kind === "input") {
    return (
      <InputBody
        nodeRef={nodeRef}
        outWireRef={outWireRef}
        initialQueue={node.props?.queue ?? []}
      />
    );
  }
  if (node.kind === "relay") {
    return <RelayBody nodeRef={nodeRef} outWireRef={outWireRef} slotId={ports.inputs[0]} />;
  }
  if (node.kind === "chaininhibitor") {
    return <ChainInhibitorBody nodeRef={nodeRef} outWireRef={outWireRef} slotId={ports.inputs[0]} />;
  }
  if (node.kind === "join") {
    return (
      <JoinBody
        nodeRef={nodeRef}
        outWireRef={outWireRef}
        slotAId={ports.inputs[0]}
        slotBId={ports.inputs[1]}
      />
    );
  }
  if (node.kind === "readgate") {
    return <ReadGateBody nodeRef={nodeRef} slotIds={ports.inputs} outWireRef={outWireRef} />;
  }
  return null;
}

export function TopologyRoot({ spec, haltedOnMount }: TopologyRootProps) {
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

  const driverConfig = useMemo(() => ({
    nodeRefs: Array.from(nodeRefs.values()),
    wireRefs: Array.from(wireRefs.values()),
  }), [nodeRefs, wireRefs]);
  const driver = useTickDriver(driverConfig);

  useEffect(() => {
    if (haltedOnMount) driver.halt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div data-testid="topology-root">
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={driver.halt} data-testid="halt">halt</button>
        <button onClick={driver.resume} data-testid="resume">resume</button>
        <button onClick={driver.step} data-testid="step">step</button>
        <span data-testid="tick">tick: {driver.tick}</span>
        <span data-testid="halted">{driver.halted ? "halted" : "running"}</span>
      </div>
      <svg width={600} height={200} data-testid="topology-svg">
        {validated.wires.map((wire) => (
          <Wire
            key={`${wire.id}:${wire.target.nodeId}:${wire.target.port}:${wire.cohort ?? 0}:${wire.pathD}`}
            ref={wireRefs.get(wire.id)!}
            pathD={wire.pathD}
            arcLength={wire.arcLength}
            destNodeRef={nodeRefs.get(wire.target.nodeId)!}
            destSlotId={wire.target.port}
            cohort={wire.cohort ?? 0}
            gate={driver.gate}
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
}
