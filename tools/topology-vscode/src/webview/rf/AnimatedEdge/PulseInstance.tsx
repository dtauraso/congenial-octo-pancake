import { useEffect, useRef } from "react";
import type { EdgeRoute } from "../../../schema";
import { extendPulse } from "../../../sim/runner";
import { isWiresRuntimePaused, subscribeWiresPause } from "../../../substrate/runtime-wires";
import { noteAnimStart, noteAnimEnd, noteAnimRerun } from "../timeline-probe";
import { type PathGeom } from "./_geom";
import { PULSE_DASH_PX } from "./_constants";
import { makeFrame } from "./_pulse-frame";
import { pulseProbeMount, pulseProbeRerun, pulseProbeUnmount } from "./_stuck-pulse-probe";

export function PulseInstance({
  edgeId, fromNodeId, toNodeId, geom, route, stroke, value, pulseId, speedPxPerMs, simStart, onDone,
}: {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  geom: PathGeom;
  route: EdgeRoute;
  stroke: string;
  value: string;
  pulseId: string;
  speedPxPerMs: number;
  simStart: number;
  onDone: () => void;
}) {
  // First run vs re-run from a geom/speed change. On first run, rAF
  // math is rooted at simStart (the emit timestamp from
  // performance.now()); on re-run, we rebase to performance.now()
  // because arcTraveledRef holds where we already were.
  const firstRunRef = useRef(true);
  const pathRef = useRef<SVGPathElement | null>(null);
  const labelRef = useRef<SVGTextElement | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const arcTraveledRef = useRef(0);
  const probeIdRef = useRef<number>(-1);
  const probeCompletedRef = useRef(false);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const svgArc = path.getTotalLength();
    if (svgArc <= 0) return;

    const isFirstRun = firstRunRef.current;
    const prevArc = arcTraveledRef.current;
    // swapStart is mutable: pause snapshots elapsed and resume rebases
    // swapStart so the per-pulse clock continues from the frozen point.
    let swapStart = isFirstRun ? simStart : performance.now();
    firstRunRef.current = false;
    const startArc = Math.min(arcTraveledRef.current, svgArc);
    const remainingArc = svgArc - startArc;
    if (remainingArc <= 0) {
      doneRef.current();
      return;
    }
    noteAnimStart(edgeId, fromNodeId, toNodeId);
    const remainingMs = remainingArc / speedPxPerMs;
    // Distance-aware: tell the simulator how long this traversal will
    // really take so its timer fallback matches the visual. Re-runs
    // on geom/speed changes so node drag updates the timer too.
    extendPulse(pulseId, remainingMs);
    if (!isFirstRun) {
      noteAnimRerun(edgeId, prevArc, startArc, svgArc, remainingMs);
      if (probeIdRef.current >= 0) pulseProbeRerun(probeIdRef.current, remainingMs);
    } else {
      probeIdRef.current = pulseProbeMount(edgeId, remainingMs);
    }

    let rafId = 0;
    const frame = makeFrame({
      edgeId, geom, route, path, label: labelRef.current,
      svgArc, startArc, remainingArc, remainingMs,
      getSwapStart: () => swapStart,
      arcTraveledRef,
      onComplete: () => { probeCompletedRef.current = true; doneRef.current(); },
      probeId: probeIdRef.current,
    });
    const loop = () => { if (frame()) rafId = requestAnimationFrame(loop); else rafId = 0; };

    // Per-pulse freeze: each in-flight pulse owns its own clock and
    // independently halts when the runtime broadcasts pause. On pause
    // we snapshot the elapsed-ms; on resume we rebase swapStart so
    // the same elapsed value is reproduced and the rAF picks up where
    // it left off. If we mount while already paused (e.g. node drag
    // re-mounts the effect mid-pause), start frozen instead of letting
    // a fresh rAF loop run the pulse to completion.
    let frozenElapsed: number | null = null;
    if (isWiresRuntimePaused()) {
      frozenElapsed = 0;
    } else {
      rafId = requestAnimationFrame(loop);
    }
    const unsubPause = subscribeWiresPause((paused) => {
      if (paused) {
        if (frozenElapsed !== null) return;
        frozenElapsed = performance.now() - swapStart;
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      } else {
        if (frozenElapsed === null) return;
        swapStart = performance.now() - frozenElapsed;
        frozenElapsed = null;
        if (!rafId) rafId = requestAnimationFrame(loop);
      }
    });

    return () => {
      unsubPause();
      if (rafId) cancelAnimationFrame(rafId);
      const elapsedNow = frozenElapsed !== null
        ? frozenElapsed
        : performance.now() - swapStart;
      const localT = Math.min(1, elapsedNow / remainingMs);
      arcTraveledRef.current = startArc + localT * remainingArc;
      noteAnimEnd(edgeId, fromNodeId, toNodeId, localT >= 1, arcTraveledRef.current);
    };
  }, [geom, speedPxPerMs]);

  // Lifecycle (noteEdgePulseStarted/Ended) used to live here as a
  // [edgeId]-keyed effect. It now lives in src/sim/runner/pulse-lifetimes
  // so it fires regardless of whether this component mounts (folded
  // edges, headless replay, future view modes). See contract C6.
  // The stuck-pulse probe still uses this effect to track per-mount
  // diagnostic state.
  useEffect(() => {
    return () => {
      if (probeIdRef.current >= 0) pulseProbeUnmount(probeIdRef.current, probeCompletedRef.current);
    };
  }, [edgeId]);

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
