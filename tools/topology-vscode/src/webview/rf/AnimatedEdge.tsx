import { useMemo, useSyncExternalStore } from "react";
import { BaseEdge, type EdgeProps } from "reactflow";
import { KIND_COLORS, type EdgeRoute } from "../../schema";
import { ruleForNodeId, effectiveSpeedPxPerMs } from "../../sim/runner";
import { getWiresMap, getWiresVersion, subscribeWires } from "../../substrate/runtime-wires";
import { markerEndUrl } from "./MarkerDefs";
import { dashForKind } from "./edge-style";
import { buildPathGeom, midpoint } from "./AnimatedEdge/_geom";
import { type EdgeData } from "./AnimatedEdge/_constants";
import { PulseInstance } from "./AnimatedEdge/PulseInstance";
import { EdgeLabels } from "./AnimatedEdge/_edge-labels";
import { usePulseLanes } from "./AnimatedEdge/_use-pulse-lanes";
import { usePulseLanesWire } from "./AnimatedEdge/_use-pulse-lanes-wire";
import { usePulseLanesTicked } from "./AnimatedEdge/_use-pulse-lanes-ticked";
import { isTickedActive } from "../../substrate/ticked";

export function AnimatedEdge(props: EdgeProps<EdgeData>) {
  const { id, source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, data } = props;
  const route: EdgeRoute = data?.route ?? "line";
  const lane = data?.lane ?? 0;
  const geom = useMemo(
    () => buildPathGeom(route, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, lane),
    [route, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, lane],
  );
  // Substrate path: if a Wire exists for this edge, use the wire-driven
  // hook (no global bus). Otherwise fall back to the legacy bus hook.
  useSyncExternalStore(subscribeWires, getWiresVersion, getWiresVersion);
  const wire = getWiresMap()?.get(id) ?? null;
  const ticked = isTickedActive();
  const legacy = usePulseLanes(id, !wire && !ticked);
  const wired = usePulseLanesWire(id, wire ?? ({ id, onArrive: () => () => {}, state: "idle", cap: 0, pending: null, send: async () => {} } as never));
  const tickedLanes = usePulseLanesTicked(id, ticked);
  const { pulses0, pulses1, concurrent, advanceLane0, advanceLane1 } = ticked ? tickedLanes : (wire ? wired : legacy);

  const kind = data?.kind ?? "any";
  const stroke = KIND_COLORS[kind] ?? "#888";
  const dash = dashForKind(kind);
  const baseStyle: React.CSSProperties = {
    ...style,
    ...(dash ? { strokeDasharray: dash } : {}),
  };
  const markerEnd = markerEndUrl(kind, data?.arrowStyle);
  const showText = data?.label || data?.valueLabel;
  const mid = showText
    ? midpoint(route, sourceX, sourceY, targetX, targetY, lane)
    : null;
  // Speed comes from the per-emitter rule so the renderer's traversal
  // and the simulator-side timer agree by construction.
  const speed = effectiveSpeedPxPerMs(ruleForNodeId(source));

  return (
    <>
      <BaseEdge path={geom.d} style={baseStyle} markerEnd={markerEnd} interactionWidth={28} />
      {pulses0.map((p) => (
        <PulseInstance
          key={`l0-${p.key}`}
          edgeId={id} fromNodeId={source} toNodeId={target}
          geom={geom} route={route} stroke={stroke}
          value={p.value} pulseId={p.pulseId}
          speedPxPerMs={speed} simStart={p.simStart}
          onDone={() => advanceLane0(p.key, p.pulseId)}
        />
      ))}
      {concurrent && pulses1.map((p) => (
        <PulseInstance
          key={`l1-${p.key}`}
          edgeId={id} fromNodeId={source} toNodeId={target}
          geom={geom} route={route} stroke={stroke}
          value={p.value} pulseId={p.pulseId}
          speedPxPerMs={speed} simStart={p.simStart}
          onDone={() => advanceLane1(p.key, p.pulseId)}
        />
      ))}
      <EdgeLabels mid={mid} label={data?.label} valueLabel={data?.valueLabel} kind={kind} stroke={stroke} />
    </>
  );
}
