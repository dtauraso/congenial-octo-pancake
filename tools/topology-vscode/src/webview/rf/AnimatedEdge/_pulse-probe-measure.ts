import type { Pt } from "./_geom";
import { PULSE_LABEL_NORMAL_PX } from "./_constants";
import {
  type ProbeWorst, probeLog, scheduleProbeDump, noteProbePulse,
  PULSE_PROBE_DRIFT_PX, PULSE_PROBE_TANGENT_PX,
} from "./_pulse-probe";

export function updateProbeWorst(
  prev: ProbeWorst | null,
  label: SVGTextElement,
  placement: { lx: number; ly: number; point: Pt; tangent: Pt; nx: number; ny: number },
  arcTraveled: number,
  svgArc: number,
): ProbeWorst | null {
  let bb;
  try { bb = label.getBBox(); }
  catch { bb = null; }
  if (!bb) return prev;
  const { lx, ly, point, tangent, nx, ny } = placement;
  const cx = lx + bb.x + bb.width / 2;
  const cy = ly + bb.y + bb.height / 2;
  const dx = cx - point.x, dy = cy - point.y;
  const measured = Math.hypot(dx, dy);
  const drift = Math.abs(measured - PULSE_LABEL_NORMAL_PX);
  const tangentSlip = Math.abs(dx * tangent.x + dy * tangent.y);
  const cos = measured > 0 ? (dx * nx + dy * ny) / measured : 1;
  const angleDeg = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
  if (!prev || drift > prev.drift || tangentSlip > prev.tangentSlip) {
    return {
      drift, tangentSlip,
      arcFrac: arcTraveled / svgArc,
      measuredOffset: measured,
      measuredAngleDeg: angleDeg,
    };
  }
  return prev;
}

export function flushProbe(edgeId: string, worst: ProbeWorst | null): void {
  noteProbePulse();
  if (!worst) return;
  if (worst.drift <= PULSE_PROBE_DRIFT_PX && worst.tangentSlip <= PULSE_PROBE_TANGENT_PX) return;
  probeLog().push({
    ts: performance.now(),
    edgeId,
    drift: worst.drift,
    tangentSlip: worst.tangentSlip,
    measuredOffset: worst.measuredOffset,
    expectedOffset: PULSE_LABEL_NORMAL_PX,
    angleDeg: worst.measuredAngleDeg,
    arcFrac: worst.arcFrac,
  });
  scheduleProbeDump();
  // eslint-disable-next-line no-console
  console.warn(
    `[pulse-probe] edge=${edgeId} worst-drift=${worst.drift.toFixed(2)}px ` +
    `tangent-slip=${worst.tangentSlip.toFixed(2)}px ` +
    `measured=${worst.measuredOffset.toFixed(2)}px (expected ${PULSE_LABEL_NORMAL_PX}px) ` +
    `angle-from-normal=${worst.measuredAngleDeg.toFixed(1)}° at arc=${(worst.arcFrac * 100).toFixed(0)}%`
  );
}
