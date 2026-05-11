// <Wire>: the substrate's wire primitive realized as a React component.
// Phase state lives here (useReducer); the source/destination call
// load/take/ack via an imperative handle.
//
// Animation is a wire-local effect keyed on entering `loaded`. When
// loaded, a RAF loop walks the pulse along the rendered path using
// performance.now() and a global pulse-speed constant. Completion
// invokes onLoadedComplete(); destination policy decides what that
// means (auto destinations call take() in the callback, manual-take
// destinations leave it as a no-op until a user click).
//
// Geometry change while loaded is handled by the effect's deps:
// arcLength change re-runs the effect, but distanceCoveredRef survives
// so the pulse resumes at its current fractional position along the
// new path (MODEL.md: "remaining traversal time is re-derived from the
// new arc length and the distance already covered").

import {
  forwardRef, useEffect, useImperativeHandle, useReducer, useRef, useState,
} from "react";
import { type Phase, initialPhase, wirePhaseReducer } from "./wire-phase";

const PULSE_SPEED_PX_PER_MS = 0.3;

export interface WireHandle {
  load(value: unknown): void;
  take(): void;
  ack(): void;
  readonly phase: Phase;
}

export interface WireProps {
  pathD: string;
  arcLength: number;
  stroke?: string;
  onLoadedComplete?: () => void;
}

export const Wire = forwardRef<WireHandle, WireProps>(function Wire(
  { pathD, arcLength, stroke = "#888", onLoadedComplete },
  ref,
) {
  const [phase, dispatch] = useReducer(wirePhaseReducer, initialPhase);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useImperativeHandle(ref, () => ({
    load: (value) => dispatch({ type: "load", value }),
    take: () => dispatch({ type: "take" }),
    ack: () => dispatch({ type: "ack" }),
    get phase() { return phaseRef.current; },
  }), []);

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
    const simStart =
      performance.now() - distanceCoveredRef.current / PULSE_SPEED_PX_PER_MS;
    let raf = 0;
    const step = () => {
      const elapsed = performance.now() - simStart;
      const distance = Math.min(elapsed * PULSE_SPEED_PX_PER_MS, arcLength);
      distanceCoveredRef.current = distance;
      const pt = path.getPointAtLength(distance);
      setPulsePos({ x: pt.x, y: pt.y });
      if (distance >= arcLength) {
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
      <path ref={pathRef} d={pathD} stroke={stroke} fill="none" strokeWidth={1.5} />
      {phase.kind === "loaded" && pulsePos && (
        <circle cx={pulsePos.x} cy={pulsePos.y} r={4} fill={stroke} />
      )}
    </g>
  );
});
