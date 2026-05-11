// TopologyRoot: orchestrator for the new substrate. Builds the wire
// and node tree from an RTopologySpec, runs useTickDriver across all
// of them, and exposes halt/resume/step controls.

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Wire, type WireHandle } from "./Wire";
import { type NodeHandle } from "./Node";
import { useTickDriver } from "./useTickDriver";
import type { RTopologySpec, RNodeSpec } from "./spec";
import { InputBody, ReadGateBody } from "./node-kinds";

export interface TopologyRootProps {
  spec: RTopologySpec;
  haltedOnMount?: boolean;
}

function findWireForInput(
  spec: RTopologySpec, nodeId: string, port: string,
): string | undefined {
  return spec.wires.find((w) => w.target.nodeId === nodeId && w.target.port === port)?.id;
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
  if (node.kind === "input") {
    const outWireId = findWireForOutput(spec, node.id, "out");
    const outWireRef = outWireId
      ? wireRefs.get(outWireId)!
      : { current: null } as RefObject<WireHandle | null>;
    return (
      <InputBody
        nodeRef={nodeRef}
        outWireRef={outWireRef}
        initialQueue={node.props?.queue ?? []}
      />
    );
  }
  if (node.kind === "readgate") {
    const inWireId = findWireForInput(spec, node.id, "in0");
    const inWireRef = inWireId
      ? wireRefs.get(inWireId)!
      : { current: null } as RefObject<WireHandle | null>;
    return <ReadGateBody nodeRef={nodeRef} inWireRef={inWireRef} />;
  }
  return null;
}

export function TopologyRoot({ spec, haltedOnMount }: TopologyRootProps) {
  // Stable refs per id, recreated only when ids change.
  const wireRefsRef = useRef<Map<string, RefObject<WireHandle | null>>>(new Map());
  const nodeRefsRef = useRef<Map<string, RefObject<NodeHandle | null>>>(new Map());

  const wireRefs = useMemo(() => {
    const next = new Map<string, RefObject<WireHandle | null>>();
    for (const w of spec.wires) {
      next.set(w.id, wireRefsRef.current.get(w.id) ?? { current: null });
    }
    wireRefsRef.current = next;
    return next;
  }, [spec.wires]);

  const nodeRefs = useMemo(() => {
    const next = new Map<string, RefObject<NodeHandle | null>>();
    for (const n of spec.nodes) {
      next.set(n.id, nodeRefsRef.current.get(n.id) ?? { current: null });
    }
    nodeRefsRef.current = next;
    return next;
  }, [spec.nodes]);

  const driverConfig = useMemo(() => ({
    nodeRefs: Array.from(nodeRefs.values()),
    wireRefs: Array.from(wireRefs.values()),
  }), [nodeRefs, wireRefs]);
  const driver = useTickDriver(driverConfig);

  useEffect(() => {
    if (haltedOnMount) driver.halt();
    // one-shot mount behavior
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
        {spec.wires.map((wire) => (
          <Wire
            key={wire.id}
            ref={wireRefs.get(wire.id)!}
            pathD={wire.pathD}
            arcLength={wire.arcLength}
          />
        ))}
      </svg>
      {spec.nodes.map((node) => (
        <NodeView
          key={node.id}
          node={node}
          spec={spec}
          nodeRef={nodeRefs.get(node.id)!}
          wireRefs={wireRefs}
        />
      ))}
    </div>
  );
}
