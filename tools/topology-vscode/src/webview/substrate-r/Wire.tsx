// <Wire>: the substrate's wire primitive realized as a React component.
// Phase state lives here; the source/destination call load/take/ack via
// an imperative handle.
//
// Transitions are applied synchronously to a phaseRef and to subscribed
// listeners before triggering a re-render. This lets the tick driver
// observe round close in the same synchronous turn that nodes ran in —
// without it, useReducer dispatch would defer commit and the driver
// would see stale phase. The React state mirror exists so visual props
// (path, pulse) recompute via the normal render cycle.
//
// Animation is a wire-local effect keyed on entering `loaded`. RAF +
// performance.now() with distance-covered held in a ref so geometry
// changes mid-loaded resume at the current fractional position along
// the new path (MODEL.md: "remaining traversal time is re-derived from
// the new arc length and the distance already covered").

import {
  forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState,
} from "react";
import { type Action, type Phase, initialPhase, wirePhaseReducer } from "./wire-phase";

const PULSE_SPEED_PX_PER_MS = 0.08;

export interface WireHandle {
  load(value: unknown): void;
  take(): void;
  ack(): void;
  readonly phase: Phase;
  subscribePhase(listener: (phase: Phase) => void): () => void;
}

export interface WireProps {
  pathD: string;
  // Optional explicit arc length. If omitted, measured from the live
  // <path> element via getTotalLength() — correct for any curve.
  arcLength?: number;
  stroke?: string;
  strokeDasharray?: string;
  markerEnd?: string;
  onLoadedComplete?: () => void;
}

export const Wire = forwardRef<WireHandle, WireProps>(function Wire(
  { pathD, arcLength, stroke = "#888", strokeDasharray, markerEnd, onLoadedComplete }, ref,
) {
  const phaseRef = useRef<Phase>(initialPhase);
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const phaseListenersRef = useRef(new Set<(p: Phase) => void>());

  const apply = useCallback((a: Action) => {
    const next = wirePhaseReducer(phaseRef.current, a);
    phaseRef.current = next;
    for (const fn of phaseListenersRef.current) fn(next);
    setPhase(next);
  }, []);

  useImperativeHandle(ref, () => ({
    load: (value) => apply({ type: "load", value }),
    take: () => apply({ type: "take" }),
    ack: () => apply({ type: "ack" }),
    get phase() { return phaseRef.current; },
    subscribePhase(listener) {
      phaseListenersRef.current.add(listener);
      return () => { phaseListenersRef.current.delete(listener); };
    },
  }), [apply]);

  const distanceCoveredRef = useRef(0);
  const pathRef = useRef<SVGPathElement>(null);
  const [pulsePos, setPulsePos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (phase.kind !== "loaded") {
      distanceCoveredRef.current = 0;
      setPulsePos(null);
      return;
    }
    const path = pathRef.current;
    if (!path) return;
    const measuredLen = arcLength ?? path.getTotalLength();
    const simStart =
      performance.now() - distanceCoveredRef.current / PULSE_SPEED_PX_PER_MS;
    let raf = 0;
    const step = () => {
      const elapsed = performance.now() - simStart;
      const distance = Math.min(elapsed * PULSE_SPEED_PX_PER_MS, measuredLen);
      distanceCoveredRef.current = distance;
      const pt = path.getPointAtLength(distance);
      setPulsePos({ x: pt.x, y: pt.y });
      if (distance >= measuredLen) {
        onLoadedComplete?.();
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase.kind, arcLength, onLoadedComplete]);

  return (
    <g>
      <path
        ref={pathRef}
        d={pathD}
        stroke={stroke}
        fill="none"
        strokeWidth={1.5}
        strokeDasharray={strokeDasharray}
        markerEnd={markerEnd}
      />
      {phase.kind === "loaded" && pulsePos && (
        <>
          <circle cx={pulsePos.x} cy={pulsePos.y} r={4} fill={stroke} />
          <text
            x={pulsePos.x + 6}
            y={pulsePos.y - 6}
            fontSize={10}
            fill={stroke}
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {String(phase.value)}
          </text>
        </>
      )}
    </g>
  );
});
