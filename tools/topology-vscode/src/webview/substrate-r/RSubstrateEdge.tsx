// React Flow edge component backed by the <Wire> substrate primitive.
// Registers its wire ref with the SubstrateProvider so the tick driver
// walks it; renders kind-coloured path, arrow marker, dash, and labels.

import { useEffect, useMemo, useRef } from "react";
import { useStore, type EdgeProps } from "reactflow";
import { Wire, type WireHandle, buildEdgePathD, edgeMidpoint, EdgeLabels, type EdgeRoute } from "./Wire";
import { useRegistry } from "./registry";
import { KIND_COLORS, type ArrowStyle, type EdgeKind } from "../../schema";

function dashForKind(kind: EdgeKind | undefined): string | undefined {
  return kind === "pointer" ? "4 3" : undefined;
}

function markerEndUrl(kind: EdgeKind, arrowStyle: ArrowStyle | undefined): string {
  return `url(#wf-arrow-${arrowStyle === "open" ? "open" : "filled"}-${kind})`;
}

interface RSubstrateEdgeData {
  kind?: EdgeKind;
  route?: EdgeRoute;
  lane?: number;
  arrowStyle?: ArrowStyle;
  label?: string;
  valueLabel?: string;
  value?: unknown;
  seed?: unknown;
}

export function RSubstrateEdge(props: EdgeProps<RSubstrateEdgeData>) {
  const {
    id, sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition, data,
  } = props;
  const target = useStore((s) => s.edges.find((e) => e.id === id)?.target ?? "");
  const targetHandle = useStore((s) => s.edges.find((e) => e.id === id)?.targetHandle);
  const wireRef = useRef<WireHandle | null>(null);
  const registry = useRegistry();

  useEffect(
    () => registry.registerWire(id, wireRef),
    [id, registry],
  );

  const destNodeRef = registry.getNodeRef(target) ?? { current: null };
  const destSlotId = targetHandle ?? "slot";

  const route: EdgeRoute = data?.route ?? "line";
  const lane = data?.lane ?? 0;
  const kind: EdgeKind = data?.kind ?? "any";
  const stroke = KIND_COLORS[kind] ?? "#888";
  const dash = dashForKind(kind);
  const markerEnd = markerEndUrl(kind, data?.arrowStyle);

  const pathD = useMemo(
    () => buildEdgePathD(
      route,
      sourceX, sourceY, sourcePosition,
      targetX, targetY, targetPosition,
      lane,
    ),
    [route, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, lane],
  );

  const mid = data?.valueLabel
    ? edgeMidpoint(route, sourceX, sourceY, targetX, targetY, lane)
    : null;

  return (
    <>
      <Wire
        ref={wireRef}
        pathD={pathD}
        stroke={stroke}
        strokeDasharray={dash}
        markerEnd={markerEnd}
        destNodeRef={destNodeRef}
        destSlotId={destSlotId}
        pauseAxis={registry.driver.pauseAxis}
        traceId={id}
        value={data?.value}
        seed={data?.seed}
      />
      <EdgeLabels
        mid={mid}
        valueLabel={data?.valueLabel}
        stroke={stroke}
      />
    </>
  );
}
