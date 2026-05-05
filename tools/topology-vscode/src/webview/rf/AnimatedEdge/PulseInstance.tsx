import { useEffect, useRef } from "react";
import type { EdgeRoute } from "../../../schema";
import { subscribeState, isPlaying, getSimTime, noteEdgePulseEnded, noteEdgePulseStarted } from "../../../sim/runner";
import { noteAnimStart, noteAnimEnd, noteAnimRerun } from "../timeline-probe";
import { type PathGeom, queryTangent } from "./_geom";
import { PULSE_DASH_PX, PULSE_LABEL_NORMAL_PX } from "./_constants";
import {
  type ProbeWorst,
  pulseProbeEnabled, probeLog, scheduleProbeDump, noteProbePulse,
  PULSE_PROBE_DRIFT_PX, PULSE_PROBE_TANGENT_PX,
} from "./_pulse-probe";

export function PulseInstance({
  edgeId, fromNodeId, toNodeId, geom, route, stroke, value, speedPxPerMs, simStart, onDone,
}: {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  geom: PathGeom;
  route: EdgeRoute;
  stroke: string;
  value: string;
  speedPxPerMs: number;
  simStart: number;
  onDone: () => void;
}) {
  // First run vs re-run from a geom/speed change. On first run, rAF
  // math is rooted at simStart (the emit timestamp); on re-run, we
  // rebase to getSimTime() because arcTraveledRef holds where we
  // already were.
  const firstRunRef = useRef(true);
  const pathRef = useRef<SVGPathElement | null>(null);
  const labelRef = useRef<SVGTextElement | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const arcTraveledRef = useRef(0);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const label = labelRef.current;
    const svgArc = path.getTotalLength();
    if (svgArc <= 0) return;

    const isFirstRun = firstRunRef.current;
    const prevArc = arcTraveledRef.current;
    const swapStart = isFirstRun ? simStart : getSimTime();
    firstRunRef.current = false;
    const startArc = Math.min(arcTraveledRef.current, svgArc);
    const remainingArc = svgArc - startArc;
    if (remainingArc <= 0) {
      doneRef.current();
      return;
    }
    noteAnimStart(edgeId, fromNodeId, toNodeId);
    const remainingMs = remainingArc / speedPxPerMs;
    if (!isFirstRun) {
      noteAnimRerun(edgeId, prevArc, startArc, svgArc, remainingMs);
    }

    let rafId = 0;
    const probeOn = pulseProbeEnabled();
    let probeWorst: ProbeWorst | null = null;

    const frame = () => {
      const elapsed = getSimTime() - swapStart;
      const localT = Math.min(1, elapsed / remainingMs);
      const arcTraveled = startArc + localT * remainingArc;
      arcTraveledRef.current = arcTraveled;

      const overall = arcTraveled / svgArc;
      const opacity =
        overall < 0.05 ? Math.max(0, overall / 0.05) :
        overall < 0.95 ? 1 :
        Math.max(0, (1 - overall) / 0.05);

      path.style.strokeDashoffset = String(-arcTraveled);
      path.style.opacity = String(opacity);

      if (label) {
        // Label rides a fixed offset ahead of the back of the dash
        // window — NOT the visible-midpoint of the clipped dash. The
        // visible-midpoint formula halves label speed in the final
        // PULSE_DASH_PX once the dash leading edge clamps to svgArc.
        // Riding the unclamped midpoint and extrapolating past the
        // path end along the end tangent keeps constant speed.
        const labelArcSvg = arcTraveled + PULSE_DASH_PX / 2;
        const queryArc = Math.min(labelArcSvg, svgArc);
        const queryPoint = path.getPointAtLength(queryArc);
        const tangent = queryTangent(geom, path, queryArc, svgArc, queryPoint);
        const point = labelArcSvg <= svgArc
          ? queryPoint
          : { x: queryPoint.x + tangent.x * (labelArcSvg - svgArc),
              y: queryPoint.y + tangent.y * (labelArcSvg - svgArc) };
        // Axis-aligned routes (snake, below): corner tangents stay in
        // the first quadrant so |ty|, -|tx| keeps the label always
        // above horizontal AND perpendicular through quad corners.
        // Cubic/line: tangent crosses quadrants — use classic
        // perpendicular-with-upward-bias.
        let nx: number, ny: number;
        if (route === "snake" || route === "below") {
          nx =  Math.abs(tangent.y);
          ny = -Math.abs(tangent.x);
        } else {
          nx = -tangent.y;
          ny =  tangent.x;
          if (ny > 0) { nx = -nx; ny = -ny; }
        }
        const lx = point.x + nx * PULSE_LABEL_NORMAL_PX;
        const ly = point.y + ny * PULSE_LABEL_NORMAL_PX;
        label.setAttribute("transform", `translate(${lx}, ${ly})`);
        // Label opacity keyed to label's own arc progress, not dot's:
        // label sits PULSE_DASH_PX/2 ahead, so sharing the dot's
        // envelope makes the label fade while it's still short of the
        // arrow tip.
        const labelOverall = labelArcSvg / svgArc;
        const labelOpacity =
          labelOverall < 0.05 ? Math.max(0, labelOverall / 0.05) :
          labelOverall < 0.95 ? 1 :
          Math.max(0, (1 - labelOverall) / 0.05);
        label.style.opacity = String(labelOpacity);

        if (probeOn) {
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
        if (probeOn) noteProbePulse();
        if (probeOn && probeWorst &&
            (probeWorst.drift > PULSE_PROBE_DRIFT_PX ||
             probeWorst.tangentSlip > PULSE_PROBE_TANGENT_PX)) {
          probeLog().push({
            ts: performance.now(),
            edgeId,
            drift: probeWorst.drift,
            tangentSlip: probeWorst.tangentSlip,
            measuredOffset: probeWorst.measuredOffset,
            expectedOffset: PULSE_LABEL_NORMAL_PX,
            angleDeg: probeWorst.measuredAngleDeg,
            arcFrac: probeWorst.arcFrac,
          });
          scheduleProbeDump();
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
    if (isPlaying()) rafId = requestAnimationFrame(frame);

    // Pause/resume rAF with play state — sim time alone would freeze
    // the math, but rAF would still tick uselessly.
    const unsubState = subscribeState(() => {
      const playing = isPlaying();
      if (!playing && rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      } else if (playing && !rafId) {
        rafId = requestAnimationFrame(frame);
      }
    });

    return () => {
      unsubState();
      if (rafId) cancelAnimationFrame(rafId);
      const elapsed = getSimTime() - swapStart;
      const localT = Math.min(1, elapsed / remainingMs);
      arcTraveledRef.current = startArc + localT * remainingArc;
      noteAnimEnd(edgeId, fromNodeId, toNodeId, localT >= 1, arcTraveledRef.current);
    };
  }, [geom, speedPxPerMs]);

  // Slot release runs exactly once per PulseInstance lifetime. Keeping
  // it out of the [geom, speedPxPerMs] effect's cleanup is load-bearing:
  // a window resize or React Flow re-layout re-runs that effect mid-
  // flight, and folding noteEdgePulseEnded into its cleanup would free
  // the simulator's edge slot every reflow.
  useEffect(() => {
    noteEdgePulseStarted(edgeId);
    return () => { noteEdgePulseEnded(edgeId); };
  }, [edgeId]);

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
