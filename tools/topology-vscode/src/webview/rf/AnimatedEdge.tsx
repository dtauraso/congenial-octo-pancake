import { useCallback, useEffect, useRef, useState } from "react";
import { BaseEdge, getBezierPath, type EdgeProps } from "reactflow";
import { KIND_COLORS, type ArrowStyle, type EdgeKind, type EdgeRoute } from "../../schema";
import { subscribe, subscribeState, getConcurrentEdges, getTickMs } from "../../sim/runner";
import { markerEndUrl } from "./MarkerDefs";
import { dashForKind } from "./edge-style";

const MAX_RIDING_LABEL_CHARS = 8;
function formatRidingValue(v: unknown): string {
  if (typeof v === "number") return String(v);
  const s = String(v);
  return s.length > MAX_RIDING_LABEL_CHARS
    ? s.slice(0, MAX_RIDING_LABEL_CHARS) + "…"
    : s;
}

type EdgeData = {
  kind?: EdgeKind;
  route?: EdgeRoute;
  lane?: number;
  arrowStyle?: ArrowStyle;
  valueLabel?: string;
  label?: string;
};

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

// Single named knob for traversal speed. Everything visual scales
// from this — there is no per-edge tuning, no per-route correction,
// no separate dot/label timing. The dot's on-screen speed is exactly
// this rate measured along the path arc, which is also the only
// thing the riding label tracks. Adjust here, not in callers.
const PULSE_PX_PER_MS_AT_REF_TICK = 0.06;
const REF_TICK_MS = 400;
// Visible dot length along the path arc. The dot is rendered as a
// dash window via strokeDasharray; the riding label reads its
// midpoint along the same arc so dot and label trace one curve.
const PULSE_DASH_PX = 20;
// Perpendicular distance from the path to the riding label, along
// the local normal at the dot's midpoint. Using the normal (not a
// fixed screen-y offset) keeps the label's track parallel to the
// dot's track on curves and diagonals.
const PULSE_LABEL_NORMAL_PX = 10;
function pulseSpeedPxPerMs(): number {
  return (REF_TICK_MS / getTickMs()) * PULSE_PX_PER_MS_AT_REF_TICK;
}

type Pulse = {
  key: number;
  value: string;
};

// One traveling pulse, driven by requestAnimationFrame against a
// single arc-traveled value. The dot (a stroke-dashoffset window on
// the edge path) and the riding label both read position from the
// same arc-traveled — there is no second animation that can drift
// from the first. On a `d` change the arc-traveled is preserved
// across the swap, so dragging a node mid-pulse continues the dot
// from where it was rather than restarting at the source.
function PulseInstance({
  d, stroke, value, speedPxPerMs, onDone,
}: {
  d: string;
  stroke: string;
  value: string;
  speedPxPerMs: number;
  onDone: () => void;
}) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const labelRef = useRef<SVGTextElement | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  // Cumulative arc traveled, preserved across `d` changes.
  const arcTraveledRef = useRef(0);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const label = labelRef.current;
    const arc = path.getTotalLength();
    if (arc <= 0) return;

    const swapStart = performance.now();
    const startArc = Math.min(arcTraveledRef.current, arc);
    const remainingArc = arc - startArc;
    if (remainingArc <= 0) {
      doneRef.current();
      return;
    }
    const remainingMs = remainingArc / speedPxPerMs;

    let rafId = 0;
    let cancelled = false;

    const frame = () => {
      const elapsed = performance.now() - swapStart;
      const localT = Math.min(1, elapsed / remainingMs);
      const arcTraveled = startArc + localT * remainingArc;
      arcTraveledRef.current = arcTraveled;

      const overall = arcTraveled / arc;
      // Match the previous fade envelope: fully opaque until the
      // last 5% of the path, then fade out.
      const opacity = overall < 0.95 ? 1 : Math.max(0, (1 - overall) / 0.05);

      path.style.strokeDashoffset = String(-arcTraveled);
      path.style.opacity = String(opacity);

      if (label) {
        // Dot's visible span on the path is [arcTraveled, headArc],
        // where headArc clamps at the path end during the tail-in
        // phase. Label rides the visible midpoint of that span so
        // dot and label stay aligned through that phase too.
        const headArc = Math.min(arc, arcTraveled + PULSE_DASH_PX);
        const labelArc = (arcTraveled + headArc) / 2;
        const p = path.getPointAtLength(labelArc);
        // Local tangent via small finite difference along the arc;
        // normal is the tangent rotated 90°. Pick the side that
        // points "up" on screen (negative y) so the label sits above
        // the dot regardless of motion direction.
        // Tangent from a strictly-interior window so the normal
        // stays well-defined as labelArc approaches the path end.
        const eps = Math.min(0.5, arc / 2);
        const sampleArc = Math.min(Math.max(labelArc, eps), arc - eps);
        const ahead = path.getPointAtLength(sampleArc + eps);
        const behind = path.getPointAtLength(sampleArc - eps);
        const tx = ahead.x - behind.x;
        const ty = ahead.y - behind.y;
        const tlen = Math.hypot(tx, ty) || 1;
        let nx = -ty / tlen;
        let ny = tx / tlen;
        if (ny > 0) { nx = -nx; ny = -ny; }
        const lx = p.x + nx * PULSE_LABEL_NORMAL_PX;
        const ly = p.y + ny * PULSE_LABEL_NORMAL_PX;
        label.setAttribute("transform", `translate(${lx}, ${ly})`);
        label.style.opacity = String(opacity);
      }

      if (localT < 1) {
        rafId = requestAnimationFrame(frame);
      } else {
        doneRef.current();
      }
    };
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      // Capture progress reached so the next effect run (after a `d`
      // swap) resumes from here on the new geometry.
      const elapsed = performance.now() - swapStart;
      const localT = Math.min(1, elapsed / remainingMs);
      if (!cancelled) return; // unreachable, kept for clarity
      arcTraveledRef.current = startArc + localT * remainingArc;
    };
  }, [d, speedPxPerMs]);

  return (
    <>
      <path
        ref={pathRef}
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={3}
        strokeDasharray={`${PULSE_DASH_PX},9999`}
        strokeDashoffset={0}
        opacity={0}
        pointerEvents="none"
      />
      <text
        ref={labelRef}
        textAnchor="middle"
        fontSize={11}
        fontWeight={400}
        fill={stroke}
        stroke="none"
        pointerEvents="none"
      >
        {value}
      </text>
    </>
  );
}

// One-shot pulses along the edge's path, queued per edge. Each
// "emit" from the runner appends to a per-edge queue; only the head
// pulse renders. When it finishes, the next dequeues. Serializing
// pulses on the same edge means a new emit waits for the previous
// pulse to reach the downstream node rather than cancelling it
// (which chopped the chain visually) or running concurrently (which
// made rapid emits stack up unreadably).
export function AnimatedEdge(props: EdgeProps<EdgeData>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, data } = props;
  const route: EdgeRoute = data?.route ?? "line";
  const lane = data?.lane ?? 0;
  const d = route === "line"
    ? getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })[0]
    : routePath(route, sourceX, sourceY, targetX, targetY, lane);

  const [pulses, setPulses] = useState<Pulse[]>([]);
  const pulseKeyRef = useRef(0);
  const [concurrent, setConcurrent] = useState(() => getConcurrentEdges().has(id));

  useEffect(() => {
    const update = () => setConcurrent(getConcurrentEdges().has(id));
    update();
    return subscribeState(update);
  }, [id]);

  useEffect(() => {
    const unsub = subscribe((ev) => {
      if (ev.type !== "emit" || ev.edgeId !== id) return;
      const key = ++pulseKeyRef.current;
      setPulses((cur) => [...cur, { key, value: formatRidingValue(ev.value) }]);
    });
    return unsub;
  }, [id]);

  const advanceQueue = useCallback(() => {
    setPulses((cur) => cur.slice(1));
  }, []);

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
      {pulses[0] && (
        <PulseInstance
          key={pulses[0].key}
          d={d}
          stroke={stroke}
          value={pulses[0].value}
          speedPxPerMs={speed}
          onDone={advanceQueue}
        />
      )}
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
