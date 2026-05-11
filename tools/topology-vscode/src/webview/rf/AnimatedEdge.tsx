import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { BaseEdge, type EdgeProps } from "reactflow";
import { KIND_COLORS, type EdgeRoute } from "../../schema";
import { markerEndUrl } from "./MarkerDefs";
import { dashForKind } from "./edge-style";
import { buildPathGeom, midpoint } from "./AnimatedEdge/_geom";
import { type EdgeData, PULSE_SPEED_PX_PER_MS } from "./AnimatedEdge/_constants";
import { EdgeLabels } from "./AnimatedEdge/_edge-labels";
import { PulseInstance } from "./AnimatedEdge/PulseInstance";
import { subscribeFrame, getFrameSnapshot } from "../frame-store";

type ActivePulse = { key: number; value: string; simStart: number };

export function AnimatedEdge(props: EdgeProps<EdgeData>) {
  const { id, source, target, sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition, style, data } = props;
  const route: EdgeRoute = data?.route ?? "line";
  const lane = data?.lane ?? 0;
  const geom = useMemo(
    () => buildPathGeom(route, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, lane),
    [route, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, lane],
  );
  const frame = useSyncExternalStore(subscribeFrame, getFrameSnapshot, getFrameSnapshot);
  const wireState = frame.wires.get(id);
  const phase = wireState?.kind ?? "empty";

  const prevPhaseRef = useRef<typeof phase>("empty");
  const pulseKeyRef = useRef(0);
  const [pulse, setPulse] = useState<ActivePulse | null>(null);

  useEffect(() => {
    const prev = prevPhaseRef.current;
    if (prev !== "loaded" && phase === "loaded" && wireState && wireState.kind === "loaded") {
      pulseKeyRef.current += 1;
      setPulse({
        key: pulseKeyRef.current,
        value: String(wireState.value),
        simStart: performance.now(),
      });
    }
    if (phase === "empty") setPulse(null);
    prevPhaseRef.current = phase;
  }, [phase, wireState]);

  const kind = data?.kind ?? "any";
  const stroke = KIND_COLORS[kind] ?? "#888";
  const dash = dashForKind(kind);
  const active = phase === "loaded" || phase === "taken";
  const baseStyle: React.CSSProperties = {
    ...style,
    ...(dash ? { strokeDasharray: dash } : {}),
    stroke,
    strokeWidth: active ? 3 : 1.5,
    opacity: active ? 1 : 0.35,
  };
  const markerEnd = markerEndUrl(kind, data?.arrowStyle);
  const showText = data?.label || data?.valueLabel;
  const showBadge = phase === "taken" && !pulse;
  const mid = (showText || showBadge)
    ? midpoint(route, sourceX, sourceY, targetX, targetY, lane)
    : null;
  const badgeValue = showBadge && wireState && wireState.kind === "taken"
    ? String(wireState.value) : null;

  return (
    <>
      <BaseEdge path={geom.d} style={baseStyle} markerEnd={markerEnd} interactionWidth={28} />
      <EdgeLabels mid={mid} label={data?.label} valueLabel={data?.valueLabel} kind={kind} stroke={stroke} />
      {pulse && (
        <PulseInstance
          key={pulse.key}
          edgeId={id}
          fromNodeId={source}
          toNodeId={target}
          geom={geom}
          route={route}
          stroke={stroke}
          value={pulse.value}
          speedPxPerMs={PULSE_SPEED_PX_PER_MS}
          simStart={pulse.simStart}
          onDone={() => setPulse((p) => (p && p.key === pulse.key ? null : p))}
        />
      )}
      {badgeValue !== null && mid && (
        <g transform={`translate(${mid.x}, ${mid.y})`} pointerEvents="none">
          <rect x={-14} y={-9} width={28} height={18} rx={4} ry={4}
            fill="#1a1a1a" stroke={stroke} strokeWidth={1} />
          <text textAnchor="middle" dominantBaseline="central" fontSize={11} fill="#fff">
            {badgeValue}
          </text>
        </g>
      )}
    </>
  );
}
