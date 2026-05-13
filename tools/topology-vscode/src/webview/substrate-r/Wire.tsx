// <Wire>: the substrate's wire primitive. Transient under the
// slot-in-node model: a value enters at load, transits while
// `in-flight`, and on arrival is written into the destination node's
// slot — the wire is never a parking spot.
//
// Each wire holds a construction-time binding to (destNodeRef,
// destSlotId). On animation completion the wire calls
// dest.fill(destSlotId, value) and dispatches `arrive`, returning to
// `empty`. No `take`/`ack`/parked state.
//
// Animation is preserved (RAF + arc length + pulse). complete() is a
// synchronous arrival path used by tests and by future deterministic
// stepping; production paths arrive via the RAF callback.

import {
  forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState,
  type RefObject,
} from "react";
import { type Action, type Phase, initialPhase, wirePhaseReducer } from "./wire-phase";
import type { NodeHandle } from "./Node";
import type { CohortGate } from "./cohort-gate";

const PULSE_SPEED_PX_PER_MS = 0.08;

export interface WireHandle {
  load(value: unknown): void;
  complete(): void;
  readonly phase: Phase;
  readonly canAccept: boolean;
  readonly cohort: number;
  subscribePhase(listener: (phase: Phase) => void): () => void;
}

export interface WireProps {
  pathD: string;
  arcLength?: number;
  stroke?: string;
  strokeDasharray?: string;
  markerEnd?: string;
  destNodeRef: RefObject<NodeHandle | null>;
  destSlotId: string;
  cohort?: number;
  gate?: CohortGate;
}

export const Wire = forwardRef<WireHandle, WireProps>(function Wire(
  { pathD, arcLength, stroke = "#888", strokeDasharray, markerEnd, destNodeRef, destSlotId, cohort = 0, gate }, ref,
) {
  const gateUnsubRef = useRef<(() => void) | null>(null);
  const phaseRef = useRef<Phase>(initialPhase);
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const phaseListenersRef = useRef(new Set<(p: Phase) => void>());

  const apply = useCallback((a: Action) => {
    const next = wirePhaseReducer(phaseRef.current, a);
    phaseRef.current = next;
    for (const fn of phaseListenersRef.current) fn(next);
    setPhase(next);
  }, []);

  const complete = useCallback(() => {
    const p = phaseRef.current;
    if (p.kind !== "in-flight") return;
    if (gate && !gate.isReleased(cohort)) {
      if (gateUnsubRef.current) return;
      gateUnsubRef.current = gate.subscribe(cohort, () => {
        gateUnsubRef.current?.();
        gateUnsubRef.current = null;
        complete();
      });
      return;
    }
    const value = p.value;
    apply({ type: "arrive" });
    destNodeRef.current?.fill(destSlotId, value);
  }, [apply, destNodeRef, destSlotId, cohort, gate]);

  useImperativeHandle(ref, () => ({
    load: (value) => apply({ type: "load", value }),
    complete,
    get phase() { return phaseRef.current; },
    get cohort() { return cohort; },
    get canAccept() {
      if (phaseRef.current.kind !== "empty") return false;
      const dest = destNodeRef.current;
      if (!dest) return false;
      return dest.slotPhase(destSlotId) === "empty";
    },
    subscribePhase(listener) {
      phaseListenersRef.current.add(listener);
      return () => { phaseListenersRef.current.delete(listener); };
    },
  }), [apply, complete, destNodeRef, destSlotId, cohort]);

  const distanceCoveredRef = useRef(0);
  const pathRef = useRef<SVGPathElement>(null);
  const [pulsePos, setPulsePos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (phase.kind !== "in-flight") {
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
        complete();
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase.kind, arcLength, complete]);

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
      {phase.kind === "in-flight" && pulsePos && (
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
