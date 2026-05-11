import { useEffect, useRef } from "react";
import type { EdgeRoute } from "../../../schema";
import { type PathGeom } from "./_geom";
import { PULSE_DASH_PX } from "./_constants";
import { makeFrame } from "./_pulse-frame";

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
  const firstRunRef = useRef(true);
  const pathRef = useRef<SVGPathElement | null>(null);
  const labelRef = useRef<SVGTextElement | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const arcTraveledRef = useRef(0);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const svgArc = path.getTotalLength();
    if (svgArc <= 0) return;

    const isFirstRun = firstRunRef.current;
    let swapStart = isFirstRun ? simStart : performance.now();
    firstRunRef.current = false;
    const startArc = Math.min(arcTraveledRef.current, svgArc);
    const remainingArc = svgArc - startArc;
    if (remainingArc <= 0) {
      doneRef.current();
      return;
    }
    const remainingMs = remainingArc / speedPxPerMs;

    let rafId = 0;
    const frame = makeFrame({
      edgeId, geom, route, path, label: labelRef.current,
      svgArc, startArc, remainingArc, remainingMs,
      getSwapStart: () => swapStart,
      arcTraveledRef,
      onComplete: () => { doneRef.current(); },
    });
    const loop = () => { if (frame()) rafId = requestAnimationFrame(loop); else rafId = 0; };
    rafId = requestAnimationFrame(loop);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      const elapsed = performance.now() - swapStart;
      const localT = Math.min(1, elapsed / remainingMs);
      arcTraveledRef.current = startArc + localT * remainingArc;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geom, speedPxPerMs]);

  // suppress unused-vars lint for fromNodeId/toNodeId kept for API compat
  void fromNodeId; void toNodeId;

  return (
    <>
      <path
        ref={pathRef}
        data-testid="pulse"
        data-edge-id={edgeId}
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
