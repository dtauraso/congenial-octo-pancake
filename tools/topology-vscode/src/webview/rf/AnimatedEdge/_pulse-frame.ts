import type { EdgeRoute } from "../../../schema";
import { getSimTime } from "../../../sim/runner";
import { type PathGeom } from "./_geom";
import { computeLabelPlacement, dotOpacity } from "./_pulse-label";
import { type ProbeWorst, pulseProbeEnabled } from "./_pulse-probe";
import { updateProbeWorst, flushProbe } from "./_pulse-probe-measure";

export type FrameCtx = {
  edgeId: string;
  geom: PathGeom;
  route: EdgeRoute;
  path: SVGPathElement;
  label: SVGTextElement | null;
  svgArc: number;
  startArc: number;
  remainingArc: number;
  remainingMs: number;
  swapStart: number;
  arcTraveledRef: { current: number };
  onComplete: () => void;
};

// Returns a tick function that returns true while animation is in
// progress, false on completion. Caller owns the rAF id so pause/
// resume can cancel and restart cleanly.
export function makeFrame(ctx: FrameCtx): () => boolean {
  const probeOn = pulseProbeEnabled();
  let probeWorst: ProbeWorst | null = null;
  let done = false;

  return () => {
    if (done) return false;
    const elapsed = getSimTime() - ctx.swapStart;
    const localT = Math.min(1, elapsed / ctx.remainingMs);
    const arcTraveled = ctx.startArc + localT * ctx.remainingArc;
    ctx.arcTraveledRef.current = arcTraveled;

    const overall = arcTraveled / ctx.svgArc;
    ctx.path.style.strokeDashoffset = String(-arcTraveled);
    ctx.path.style.opacity = String(dotOpacity(overall));

    if (ctx.label) {
      const placement = computeLabelPlacement(ctx.geom, ctx.path, ctx.route, arcTraveled, ctx.svgArc);
      ctx.label.setAttribute("transform", `translate(${placement.lx}, ${placement.ly})`);
      ctx.label.style.opacity = String(placement.labelOpacity);
      if (probeOn) {
        probeWorst = updateProbeWorst(probeWorst, ctx.label, placement, arcTraveled, ctx.svgArc);
      }
    }

    if (localT < 1) return true;
    done = true;
    if (probeOn) flushProbe(ctx.edgeId, probeWorst);
    ctx.onComplete();
    return false;
  };
}
