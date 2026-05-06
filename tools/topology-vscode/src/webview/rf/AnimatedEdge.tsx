import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BaseEdge, type EdgeProps } from "reactflow";
import { KIND_COLORS, type EdgeRoute } from "../../schema";
import {
  subscribe, subscribeState, getConcurrentEdges, getSimTime,
  ruleForNodeId, signalRendererComplete,
  tryClaimVisualSlot, releaseVisualSlot,
} from "../../sim/runner";
import { markerEndUrl } from "./MarkerDefs";
import { dashForKind } from "./edge-style";
import { buildPathGeom } from "./AnimatedEdge/_geom";
import { midpoint } from "./AnimatedEdge/_geom";
import {
  type EdgeData, type Pulse,
  formatRidingValue, pulseSpeedPxPerMs,
} from "./AnimatedEdge/_constants";
import { PulseInstance } from "./AnimatedEdge/PulseInstance";

export function AnimatedEdge(props: EdgeProps<EdgeData>) {
  const { id, source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, data } = props;
  const route: EdgeRoute = data?.route ?? "line";
  const lane = data?.lane ?? 0;
  const geom = useMemo(
    () => buildPathGeom(route, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, lane),
    [route, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, lane],
  );
  const d = geom.d;

  // Two parallel pulse lanes for concurrent edges; the runner emits a
  // second pulse one tick ahead via concurrentEdges. Within a lane,
  // pulses queue serially. Non-concurrent edges only ever populate
  // lane 0.
  const [pulses0, setPulses0] = useState<Pulse[]>([]);
  const [pulses1, setPulses1] = useState<Pulse[]>([]);
  const len0Ref = useRef(0);
  const len1Ref = useRef(0);
  len0Ref.current = pulses0.length;
  len1Ref.current = pulses1.length;
  const pulseKeyRef = useRef(0);
  const [concurrent, setConcurrent] = useState(() => getConcurrentEdges().has(id));
  const concurrentRef = useRef(concurrent);
  concurrentRef.current = concurrent;
  useEffect(() => {
    const update = () => setConcurrent(getConcurrentEdges().has(id));
    update();
    return subscribeState(update);
  }, [id]);

  // Release any held visual slots if the edge itself unmounts (e.g.
  // fold collapsed it). Without this the per-edge slot ledger leaks.
  useEffect(() => {
    return () => {
      const held = len0Ref.current + len1Ref.current;
      for (let i = 0; i < held; i++) releaseVisualSlot(id);
    };
  }, [id]);

  useEffect(() => {
    const unsub = subscribe((ev) => {
      if (ev.type !== "emit" || ev.edgeId !== id) return;
      const rule = ruleForNodeId(ev.fromNodeId);
      // Visual concurrency cap: if the edge already has cap pulses
      // rendering, skip this one. The runner-side lifecycle (started/
      // ended via pulse-lifetimes) still balances on its own —
      // contract C8.
      if (!tryClaimVisualSlot(id, rule.maxConcurrentPerEdge)) return;
      const key = ++pulseKeyRef.current;
      const pulse: Pulse = {
        key,
        pulseId: ev.pulseId,
        value: formatRidingValue(ev.value),
        simStart: getSimTime(),
      };
      if (concurrentRef.current && len1Ref.current < len0Ref.current) {
        len1Ref.current += 1;
        setPulses1((cur) => [...cur, pulse]);
      } else {
        len0Ref.current += 1;
        setPulses0((cur) => [...cur, pulse]);
      }
    });
    return unsub;
  }, [id]);

  // Drop-by-key, not slice(1): pulses animate concurrently and a
  // shorter-arc geometry change could let a later pulse finish first.
  const advanceLane0 = useCallback((key: number, pulseId: string) => {
    signalRendererComplete(pulseId);
    releaseVisualSlot(id);
    setPulses0((cur) => cur.filter((p) => p.key !== key));
    if (len0Ref.current > 0) len0Ref.current -= 1;
  }, [id]);
  const advanceLane1 = useCallback((key: number, pulseId: string) => {
    signalRendererComplete(pulseId);
    releaseVisualSlot(id);
    setPulses1((cur) => cur.filter((p) => p.key !== key));
    if (len1Ref.current > 0) len1Ref.current -= 1;
  }, [id]);

  const kind = data?.kind ?? "any";
  const stroke = KIND_COLORS[kind] ?? "#888";
  const dash = dashForKind(kind);
  const baseStyle: React.CSSProperties = {
    ...style,
    ...(dash ? { strokeDasharray: dash } : {}),
  };
  const markerEnd = markerEndUrl(kind, data?.arrowStyle);

  const label = data?.label;
  const valueLabel = data?.valueLabel;
  const showText = label || valueLabel;
  const mid = showText
    ? midpoint(route, sourceX, sourceY, targetX, targetY, lane)
    : null;

  const speed = pulseSpeedPxPerMs();

  return (
    <>
      <BaseEdge path={d} style={baseStyle} markerEnd={markerEnd} interactionWidth={28} />
      {pulses0.map((p) => (
        <PulseInstance
          key={`l0-${p.key}`}
          edgeId={id}
          fromNodeId={source}
          toNodeId={target}
          geom={geom}
          route={route}
          stroke={stroke}
          value={p.value}
          speedPxPerMs={speed}
          simStart={p.simStart}
          onDone={() => advanceLane0(p.key, p.pulseId)}
        />
      ))}
      {concurrent && pulses1.map((p) => (
        <PulseInstance
          key={`l1-${p.key}`}
          edgeId={id}
          fromNodeId={source}
          toNodeId={target}
          geom={geom}
          route={route}
          stroke={stroke}
          value={p.value}
          speedPxPerMs={speed}
          simStart={p.simStart}
          onDone={() => advanceLane1(p.key, p.pulseId)}
        />
      ))}
      {mid && label && (
        <text
          x={mid.x}
          y={mid.y - 6}
          textAnchor="middle"
          fontSize={12}
          fontWeight={kind === "feedback-ack" ? 600 : 300}
          fill="#111"
          stroke="none"
          pointerEvents="none"
        >
          {kind === "feedback-ack" ? `↻ ${label}` : label}
        </text>
      )}
      {mid && valueLabel && (
        <text
          x={mid.x}
          y={mid.y + (label ? 10 : -6)}
          textAnchor="middle"
          fontSize={12}
          fontWeight={300}
          fill={stroke}
          stroke="none"
          pointerEvents="none"
        >
          {valueLabel}
        </text>
      )}
    </>
  );
}
