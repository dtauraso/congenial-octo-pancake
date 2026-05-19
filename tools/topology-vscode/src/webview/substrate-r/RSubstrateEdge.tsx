// React Flow edge component backed by the <Wire> substrate primitive.
// Registers its wire ref with the SubstrateProvider so the RAF driver
// walks it; renders kind-coloured path, arrow marker, dash, and labels.

import { useEffect, useMemo, useRef } from "react";
import { useStore, type EdgeProps } from "reactflow";
import { Wire, type WireHandle, buildEdgePathD, edgeMidpoint, EdgeLabels, pickShape, type EdgeRoute, type SideName } from "./Wire";
import { useRegistry } from "./registry";
import { KIND_COLORS, type ArrowStyle, type EdgeKind } from "../../schema";
import { LaneDragHandle } from "./LaneDragHandle";
import { markerEndUrl } from "../rf/MarkerDefs";

// Marker head lengths (refX of the filled markers in MarkerDefs).
// Shrink to sm only when the path is shorter than the md head itself,
// otherwise the head visually overflows the path tail. Drop the marker
// entirely when the path is shorter than the sm head.
const MD_HEAD_PX = 8;
const SM_HEAD_PX = 5;

function dashForKind(kind: EdgeKind | undefined): string | undefined {
  return kind === "pointer" ? "4 3" : undefined;
}

// Length of the final segment of the edge — the leg the arrow sits on.
// Marker-shrink decisions should use this, not total path length: a long
// dogleg route can still terminate in a tiny entry leg where a full-size
// arrow visually dominates. For the bezier "line" route there is no
// distinct final segment, so fall back to the chord length.
function finalSegmentLength(
  route: EdgeRoute,
  sx: number, sy: number,
  tx: number, ty: number,
  lane: number,
): number {
  if (route === "snake") {
    const midX = (sx + tx) / 2 + lane;
    return Math.abs(tx - midX);
  }
  if (route === "snake-v") {
    const midY = (sy + ty) / 2 + lane;
    return Math.abs(ty - midY);
  }
  if (route === "below") {
    const corridorY = Math.max(sy, ty) + 80 + lane;
    return corridorY - ty;
  }
  const dx = tx - sx, dy = ty - sy;
  return Math.sqrt(dx * dx + dy * dy);
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

  const route: EdgeRoute = data?.route ?? pickShape(
    sourceX, sourceY, sourcePosition as SideName,
    targetX, targetY, targetPosition as SideName,
  );
  const lane = data?.lane ?? 0;
  const kind: EdgeKind = data?.kind ?? "any";
  const stroke = KIND_COLORS[kind] ?? "#888";
  const dash = dashForKind(kind);
  const legLen = finalSegmentLength(route, sourceX, sourceY, targetX, targetY, lane);
  const markerSize: "sm" | "md" = legLen < MD_HEAD_PX ? "sm" : "md";
  const markerEnd = legLen < SM_HEAD_PX ? undefined : markerEndUrl(kind, data?.arrowStyle, markerSize);

  const pathD = useMemo(
    () => buildEdgePathD(
      route,
      sourceX, sourceY, sourcePosition,
      targetX, targetY, targetPosition,
      lane,
    ),
    [route, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, lane],
  );

  const showHandle = route === "snake" || route === "snake-v" || route === "below";
  const mid = (data?.valueLabel || showHandle)
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
      {showHandle && mid && (
        <LaneDragHandle
          edgeId={id}
          route={route}
          pathD={pathD}
          mid={mid}
          lane={lane}
          stroke={stroke}
        />
      )}
    </>
  );
}
