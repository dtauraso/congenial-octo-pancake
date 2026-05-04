import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BaseEdge, type EdgeProps } from "reactflow";
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

// --- Path geometry: single source of truth for `d` and per-arc
// position/tangent. Replaces finite-difference normal sampling, which
// produced point/tangent inconsistency at the end of a bezier (the
// tangent was clamped away from the path end while the point was
// not, so on a tightly curling cubic the label drifted ~25–30px off
// the parallel curve). Here, point and tangent are always evaluated
// at the same parameter, so that mismatch is structurally impossible.

type Pt = { x: number; y: number };

type StraightSeg = {
  kind: "straight";
  p0: Pt; p1: Pt;
  len: number;
  ux: number; uy: number;
};
type CubicSeg = {
  kind: "cubic";
  p0: Pt; c1: Pt; c2: Pt; p1: Pt;
};
type Seg = StraightSeg | CubicSeg;
type PathGeom = {
  d: string;
  segs: Seg[];
  cum: number[];
  // Sum of straight-segment lengths. For a single cubic this is 0;
  // we never use chord arc to query a cubic — Newton inversion on
  // the analytic cubic uses the SVG-arc position directly.
  straightTotal: number;
};

// Mirrors reactflow's getBezierPath control-point math. Lifted so we
// own both the `d` string and the analytic control points.
function controlOffset(distance: number): number {
  return distance >= 0 ? 0.5 * distance : 0.25 * 25 * Math.sqrt(-distance);
}
function controlPoint(pos: string, x1: number, y1: number, x2: number, y2: number): Pt {
  switch (pos) {
    case "left":   return { x: x1 - controlOffset(x1 - x2), y: y1 };
    case "right":  return { x: x1 + controlOffset(x2 - x1), y: y1 };
    case "top":    return { x: x1, y: y1 - controlOffset(y1 - y2) };
    case "bottom": return { x: x1, y: y1 + controlOffset(y2 - y1) };
    default:       return { x: x1, y: y1 };
  }
}

function bezierAt(seg: CubicSeg, t: number): Pt {
  const u = 1 - t;
  const a = u*u*u, b = 3*u*u*t, c = 3*u*t*t, d = t*t*t;
  return {
    x: a*seg.p0.x + b*seg.c1.x + c*seg.c2.x + d*seg.p1.x,
    y: a*seg.p0.y + b*seg.c1.y + c*seg.c2.y + d*seg.p1.y,
  };
}
function bezierTangentAt(seg: CubicSeg, t: number): Pt {
  const u = 1 - t;
  const a = 3*u*u, b = 6*u*t, c = 3*t*t;
  return {
    x: a*(seg.c1.x-seg.p0.x) + b*(seg.c2.x-seg.c1.x) + c*(seg.p1.x-seg.c2.x),
    y: a*(seg.c1.y-seg.p0.y) + b*(seg.c2.y-seg.c1.y) + c*(seg.p1.y-seg.c2.y),
  };
}

function makeCubicSeg(p0: Pt, c1: Pt, c2: Pt, p1: Pt): CubicSeg {
  return { kind: "cubic", p0, c1, c2, p1 };
}

// Recover the cubic parameter t such that B(t) ≈ target. Newton on
// the projection of (target - B(t)) onto the unit tangent. Two or
// three iterations from a reasonable seed converge to sub-pixel.
function findCubicT(seg: CubicSeg, target: Pt, t0: number): number {
  let t = Math.max(0, Math.min(1, t0));
  for (let i = 0; i < 4; i++) {
    const p = bezierAt(seg, t);
    const tg = bezierTangentAt(seg, t);
    const denom = tg.x * tg.x + tg.y * tg.y;
    if (denom < 1e-9) break;
    const dx = target.x - p.x, dy = target.y - p.y;
    const step = (tg.x * dx + tg.y * dy) / denom;
    const next = Math.max(0, Math.min(1, t + step));
    if (Math.abs(next - t) < 1e-5) { t = next; break; }
    t = next;
  }
  return t;
}

function addStraight(segs: Seg[], x0: number, y0: number, x1: number, y1: number) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const u = len || 1;
  segs.push({
    kind: "straight",
    p0: { x: x0, y: y0 }, p1: { x: x1, y: y1 },
    len, ux: dx/u, uy: dy/u,
  });
}

function finalize(d: string, segs: Seg[]): PathGeom {
  const cum: number[] = [];
  let acc = 0;
  for (const s of segs) {
    acc += s.kind === "straight" ? s.len : 0;
    cum.push(acc);
  }
  return { d, segs, cum, straightTotal: acc };
}

function buildPathGeom(
  route: EdgeRoute,
  sx: number, sy: number, sp: string,
  tx: number, ty: number, tp: string,
  lane: number,
): PathGeom {
  const segs: Seg[] = [];
  if (route === "snake") {
    const midX = (sx + tx) / 2 + lane;
    addStraight(segs, sx, sy, midX, sy);
    addStraight(segs, midX, sy, midX, ty);
    addStraight(segs, midX, ty, tx, ty);
    return finalize(`M ${sx},${sy} L ${midX},${sy} L ${midX},${ty} L ${tx},${ty}`, segs);
  }
  if (route === "below") {
    const corridorY = Math.max(sy, ty) + 40 + lane;
    addStraight(segs, sx, sy, sx, corridorY);
    addStraight(segs, sx, corridorY, tx, corridorY);
    addStraight(segs, tx, corridorY, tx, ty);
    return finalize(`M ${sx},${sy} L ${sx},${corridorY} L ${tx},${corridorY} L ${tx},${ty}`, segs);
  }
  const c1 = controlPoint(sp, sx, sy, tx, ty);
  const c2 = controlPoint(tp, tx, ty, sx, sy);
  segs.push(makeCubicSeg({ x: sx, y: sy }, c1, c2, { x: tx, y: ty }));
  return finalize(`M ${sx},${sy} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${tx},${ty}`, segs);
}

// Query unit tangent at SVG-arc position `svgArc`. The point is read
// from SVG (so it matches the dot exactly); for a cubic edge we
// recover the parameter t from that point via Newton inversion and
// evaluate B'(t) analytically.
function queryTangent(
  geom: PathGeom,
  path: SVGPathElement,
  svgArc: number,
  svgTotal: number,
  point: Pt,
): Pt {
  // Single-cubic case.
  if (geom.segs.length === 1 && geom.segs[0].kind === "cubic") {
    const seg = geom.segs[0];
    const t0 = svgTotal > 0 ? svgArc / svgTotal : 0;
    const t = findCubicT(seg, point, t0);
    const tg = bezierTangentAt(seg, t);
    const tlen = Math.hypot(tg.x, tg.y) || 1;
    return { x: tg.x / tlen, y: tg.y / tlen };
  }
  // All-straight case: SVG arc equals straight chord arc, so walk
  // segments by `svgArc` directly.
  let segStart = 0;
  for (let i = 0; i < geom.segs.length; i++) {
    if (svgArc <= geom.cum[i] || i === geom.segs.length - 1) {
      const seg = geom.segs[i];
      if (seg.kind === "straight") return { x: seg.ux, y: seg.uy };
      break;
    }
    segStart = geom.cum[i];
  }
  // Mixed routes (none today): fall back to a tiny SVG-arc finite
  // difference. Kept as a safety net, not the primary path.
  void segStart;
  const eps = Math.min(0.5, svgTotal / 2);
  const sample = Math.min(Math.max(svgArc, eps), svgTotal - eps);
  const a = path.getPointAtLength(sample + eps);
  const b = path.getPointAtLength(sample - eps);
  const tx = a.x - b.x, ty = a.y - b.y;
  const tlen = Math.hypot(tx, ty) || 1;
  return { x: tx / tlen, y: ty / tlen };
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

// Visual invariant probe. When enabled, each pulse measures the
// actually-rendered label center against the dot center and logs a
// one-line summary if the offset deviates from the configured value.
// Catches the class of bug where geometry math is correct but
// rendering quirks (text baseline, transform composition, …) move
// the visible result. Toggle at runtime via devtools:
//   window.__pulseProbe = true
// or persist with `localStorage.setItem("pulseProbe", "1")`.
declare global {
  interface Window { __pulseProbe?: boolean }
}
const PULSE_PROBE_DRIFT_PX = 1.5;
const PULSE_PROBE_TANGENT_PX = 1.5;
function pulseProbeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (window.__pulseProbe) return true;
  try { return window.localStorage?.getItem("pulseProbe") === "1"; }
  catch { return false; }
}

type ProbeWorst = {
  drift: number;        // |measured offset| - PULSE_LABEL_NORMAL_PX
  tangentSlip: number;  // measured offset projected onto local tangent
  arcFrac: number;      // arcTraveled / svgArc at worst sample
  measuredOffset: number;
  measuredAngleDeg: number; // angle between measured offset and expected normal
};

function PulseInstance({
  edgeId, geom, stroke, value, speedPxPerMs, onDone,
}: {
  edgeId: string;
  geom: PathGeom;
  stroke: string;
  value: string;
  speedPxPerMs: number;
  onDone: () => void;
}) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const labelRef = useRef<SVGTextElement | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  // Cumulative arc traveled in SVG arc units, preserved across `d`
  // changes. SVG arc (used by strokeDashoffset) and our chord-arc
  // (used by queryGeom) are reconciled with a per-`d` scale factor.
  const arcTraveledRef = useRef(0);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const label = labelRef.current;
    const svgArc = path.getTotalLength();
    if (svgArc <= 0) return;

    const swapStart = performance.now();
    const startArc = Math.min(arcTraveledRef.current, svgArc);
    const remainingArc = svgArc - startArc;
    if (remainingArc <= 0) {
      doneRef.current();
      return;
    }
    const remainingMs = remainingArc / speedPxPerMs;

    let rafId = 0;
    const probeOn = pulseProbeEnabled();
    let probeWorst: ProbeWorst | null = null;

    const frame = () => {
      const elapsed = performance.now() - swapStart;
      const localT = Math.min(1, elapsed / remainingMs);
      const arcTraveled = startArc + localT * remainingArc;
      arcTraveledRef.current = arcTraveled;

      const overall = arcTraveled / svgArc;
      const opacity = overall < 0.95 ? 1 : Math.max(0, (1 - overall) / 0.05);

      path.style.strokeDashoffset = String(-arcTraveled);
      path.style.opacity = String(opacity);

      if (label) {
        // Label rides the dot's visible midpoint (arcTraveled is the
        // back of the dash window; +DASH/2 is its center). Point
        // comes from SVG (matches the dot exactly); tangent comes
        // from the analytic cubic via Newton inversion at that
        // point. Same parameter for both — no sampling mismatch.
        const headArc = Math.min(svgArc, arcTraveled + PULSE_DASH_PX);
        const labelArcSvg = (arcTraveled + headArc) / 2;
        const point = path.getPointAtLength(labelArcSvg);
        const tangent = queryTangent(geom, path, labelArcSvg, svgArc, point);
        let nx = -tangent.y;
        let ny = tangent.x;
        if (ny > 0) { nx = -nx; ny = -ny; }
        const lx = point.x + nx * PULSE_LABEL_NORMAL_PX;
        const ly = point.y + ny * PULSE_LABEL_NORMAL_PX;
        label.setAttribute("transform", `translate(${lx}, ${ly})`);
        label.style.opacity = String(opacity);

        if (probeOn) {
          // Local-coords bbox of the rendered text, plus the
          // translate, gives the actual on-screen label center.
          // Compare against the dot center (= `point`). With the
          // current model, label center should sit exactly
          // PULSE_LABEL_NORMAL_PX along (nx, ny) with no tangential
          // component. Anything else is a rendering surprise.
          let bb;
          try { bb = label.getBBox(); }
          catch { bb = null; }
          if (bb) {
            const cx = lx + bb.x + bb.width / 2;
            const cy = ly + bb.y + bb.height / 2;
            const dx = cx - point.x, dy = cy - point.y;
            const measured = Math.hypot(dx, dy);
            const drift = Math.abs(measured - PULSE_LABEL_NORMAL_PX);
            const tangentSlip = Math.abs(dx * tangent.x + dy * tangent.y);
            const cos = measured > 0 ? (dx * nx + dy * ny) / measured : 1;
            const angleDeg = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
            if (!probeWorst || drift > probeWorst.drift || tangentSlip > probeWorst.tangentSlip) {
              probeWorst = {
                drift, tangentSlip,
                arcFrac: arcTraveled / svgArc,
                measuredOffset: measured,
                measuredAngleDeg: angleDeg,
              };
            }
          }
        }
      }

      if (localT < 1) {
        rafId = requestAnimationFrame(frame);
      } else {
        if (probeOn && probeWorst &&
            (probeWorst.drift > PULSE_PROBE_DRIFT_PX ||
             probeWorst.tangentSlip > PULSE_PROBE_TANGENT_PX)) {
          // eslint-disable-next-line no-console
          console.warn(
            `[pulse-probe] edge=${edgeId} worst-drift=${probeWorst.drift.toFixed(2)}px ` +
            `tangent-slip=${probeWorst.tangentSlip.toFixed(2)}px ` +
            `measured=${probeWorst.measuredOffset.toFixed(2)}px (expected ${PULSE_LABEL_NORMAL_PX}px) ` +
            `angle-from-normal=${probeWorst.measuredAngleDeg.toFixed(1)}° at arc=${(probeWorst.arcFrac * 100).toFixed(0)}%`
          );
        }
        doneRef.current();
      }
    };
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      const elapsed = performance.now() - swapStart;
      const localT = Math.min(1, elapsed / remainingMs);
      arcTraveledRef.current = startArc + localT * remainingArc;
    };
  }, [geom, speedPxPerMs]);

  return (
    <>
      <path
        ref={pathRef}
        d={geom.d}
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
        dominantBaseline="central"
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

export function AnimatedEdge(props: EdgeProps<EdgeData>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, data } = props;
  const route: EdgeRoute = data?.route ?? "line";
  const lane = data?.lane ?? 0;
  const geom = useMemo(
    () => buildPathGeom(route, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, lane),
    [route, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, lane],
  );
  const d = geom.d;

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
          edgeId={id}
          geom={geom}
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
