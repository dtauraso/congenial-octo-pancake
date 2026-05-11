// React Flow edge component backed by the new <Wire> substrate
// primitive. Registers its wire ref with the SubstrateProvider so the
// tick driver walks it; renders the path + animation via <Wire>.
//
// Replaces AnimatedEdge. Doesn't read from frame-store, doesn't post
// pulse-arrived — <Wire> handles all of that internally.

import { useEffect, useMemo, useRef } from "react";
import type { EdgeProps } from "reactflow";
import { Wire, type WireHandle } from "./Wire";
import { useRegistry } from "./registry";

interface RSubstrateEdgeData {
  kind?: string;
}

function buildLinePath(
  sx: number, sy: number, tx: number, ty: number,
): { d: string; len: number } {
  const dx = tx - sx;
  const dy = ty - sy;
  return {
    d: `M ${sx} ${sy} L ${tx} ${ty}`,
    len: Math.sqrt(dx * dx + dy * dy),
  };
}

export function RSubstrateEdge(props: EdgeProps<RSubstrateEdgeData>) {
  const { id, sourceX, sourceY, targetX, targetY } = props;
  const wireRef = useRef<WireHandle | null>(null);
  const registry = useRegistry();

  useEffect(
    () => registry.registerWire(id, wireRef),
    [id, registry],
  );

  const geom = useMemo(
    () => buildLinePath(sourceX, sourceY, targetX, targetY),
    [sourceX, sourceY, targetX, targetY],
  );

  return (
    <Wire
      ref={wireRef}
      pathD={geom.d}
      arcLength={geom.len}
      stroke="#888"
    />
  );
}
