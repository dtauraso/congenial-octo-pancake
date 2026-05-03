import { useEffect, useRef, useState } from "react";
import { BaseEdge, getBezierPath, type EdgeProps } from "reactflow";
import { KIND_COLORS, type ArrowStyle, type EdgeKind, type EdgeRoute } from "../../schema";
import { subscribe, subscribeState, getConcurrentEdges, getTickMs } from "../../sim/runner";
import { markerEndUrl } from "./MarkerDefs";
import { dashForKind } from "./edge-style";

type EdgeData = {
  kind?: EdgeKind;
  route?: EdgeRoute;
  lane?: number;
  arrowStyle?: ArrowStyle;
  valueLabel?: string;
  label?: string;
};

// Midpoint for a route — used to anchor label / valueLabel text.
function midpoint(
  route: EdgeRoute,
  sx: number, sy: number, tx: number, ty: number, lane: number,
): { x: number; y: number } {
  if (route === "snake") {
    const midX = (sx + tx) / 2 + lane;
    return { x: midX, y: (sy + ty) / 2 };
  }
  if (route === "below") {
    const corridorY = Math.max(sy, ty) + 40 + lane;
    return { x: (sx + tx) / 2, y: corridorY };
  }
  return { x: (sx + tx) / 2, y: (sy + ty) / 2 };
}

// Manhattan path computation per route. `lane` displaces the bend so
// parallel edges (read-pair old/new, sibling feedback-acks) don't
// overlap. Reference: docs/svg-style-guide.md §6.
function routePath(
  route: EdgeRoute,
  sx: number, sy: number,
  tx: number, ty: number,
  lane: number,
): string {
  if (route === "snake") {
    const midX = (sx + tx) / 2 + lane;
    return `M ${sx},${sy} L ${midX},${sy} L ${midX},${ty} L ${tx},${ty}`;
  }
  if (route === "below") {
    const corridorY = Math.max(sy, ty) + 40 + lane;
    return `M ${sx},${sy} L ${sx},${corridorY} L ${tx},${corridorY} L ${tx},${ty}`;
  }
  return `M ${sx},${sy} L ${tx},${ty}`;
}

// Pulse traversal time, paced relative to the runner's tick interval so
// fan-out flashes don't all complete in 600ms regardless of how slow
// the user has set the slider. Folds in the per-event wall-clock pacing
// polish noted at the bottom of phase-5.5.md.
const PULSE_MIN_MS = 200;
const PULSE_MAX_MS = 1200;
function pulseDurationMs(): number {
  const t = getTickMs();
  return Math.max(PULSE_MIN_MS, Math.min(PULSE_MAX_MS, Math.round(t * 1.2)));
}

// One-shot pulse along the edge's bezier path, retriggered by every
// "emit" event the runner publishes for this edge id. Replaces the
// continuous WAAPI loop of the old playback model.
export function AnimatedEdge(props: EdgeProps<EdgeData>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, data } = props;
  const route: EdgeRoute = data?.route ?? "line";
  const lane = data?.lane ?? 0;
  // `line` keeps the existing bezier (RF default look) so unmarked
  // edges don't shift visually. `snake` / `below` switch to Manhattan.
  const d = route === "line"
    ? getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })[0]
    : routePath(route, sourceX, sourceY, targetX, targetY, lane);

  const pulseRef = useRef<SVGPathElement | null>(null);
  const [concurrent, setConcurrent] = useState(() => getConcurrentEdges().has(id));

  useEffect(() => {
    const update = () => setConcurrent(getConcurrentEdges().has(id));
    update();
    return subscribeState(update);
  }, [id]);

  useEffect(() => {
    const path = pulseRef.current;
    if (!path) return;
    const unsub = subscribe((ev) => {
      if (ev.type !== "emit" || ev.edgeId !== id) return;
      const len = path.getTotalLength();
      // Cancel an in-flight pulse before retriggering so concurrent-edge
      // mode (Chunk D) restarts cleanly instead of compositing.
      path.getAnimations().forEach((a) => a.cancel());
      path.animate(
        [
          { strokeDashoffset: "0", opacity: 1, offset: 0 },
          { strokeDashoffset: `${-len}`, opacity: 1, offset: 0.95 },
          { strokeDashoffset: `${-len}`, opacity: 0, offset: 1 },
        ],
        { duration: pulseDurationMs() },
      );
    });
    return unsub;
  }, [id, d]);

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

  return (
    <>
      <BaseEdge path={d} style={baseStyle} markerEnd={markerEnd} interactionWidth={28} />
      {concurrent && (
        <path
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth={6}
          opacity={0.18}
          pointerEvents="none"
        />
      )}
      <path
        ref={pulseRef}
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={3}
        strokeDasharray="20,9999"
        strokeDashoffset={0}
        opacity={0}
        pointerEvents="none"
      />
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
