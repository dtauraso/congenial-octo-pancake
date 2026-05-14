// <Wire>: the substrate's wire primitive. Transient under the
// slot-in-node model.
//
// Two clocks run side-by-side and neither overrides the other:
//
//   • Substrate delivery (dest.fill) happens on animation completion.
//     The wire calls dest.fill(slotId, v) once per load.
//
//   • Visual animation is RAF-driven. The pulse travels along the
//     path at a fixed speed. Reaching the endpoint marks animation
//     done and triggers delivery.
//
//   • Phase transition `in-flight → empty` happens once the animation
//     clock has closed. That is when the wire is observably ready
//     for the next load.
//
// `complete()` on the handle is a synchronous "force-finish" hook
// used by tests.

import {
  forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState,
  type RefObject,
} from "react";
import { type Action, type Phase, initialPhase, wirePhaseReducer } from "./wire-phase";
import type { NodeHandle } from "./Node";
import type { PauseAxis } from "./pause-axis";

const PULSE_SPEED_PX_PER_MS = 0.08;

export interface WireHandle {
  load(value: unknown): void;
  complete(): void;
  readonly phase: Phase;
  readonly canAccept: boolean;
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
  pauseAxis?: PauseAxis;
}

export const Wire = forwardRef<WireHandle, WireProps>(function Wire(
  { pathD, arcLength, stroke = "#888", strokeDasharray, markerEnd, destNodeRef, destSlotId, pauseAxis }, ref,
) {
  const phaseRef = useRef<Phase>(initialPhase);
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const phaseListenersRef = useRef(new Set<(p: Phase) => void>());
  const pendingDeliverRef = useRef(false);
  const animDoneRef = useRef(false);
  const valueRef = useRef<unknown>(undefined);

  const apply = useCallback((a: Action) => {
    const next = wirePhaseReducer(phaseRef.current, a);
    phaseRef.current = next;
    for (const fn of phaseListenersRef.current) fn(next);
    setPhase(next);
  }, []);

  const deliverIfPending = useCallback(() => {
    if (!pendingDeliverRef.current) return;
    pendingDeliverRef.current = false;
    destNodeRef.current?.fill(destSlotId, valueRef.current);
  }, [destNodeRef, destSlotId]);

  const tryFinalize = useCallback(() => {
    if (phaseRef.current.kind !== "in-flight") return;
    if (!animDoneRef.current) return;
    deliverIfPending();
    animDoneRef.current = false;
    apply({ type: "arrive" });
  }, [apply, deliverIfPending]);

  const load = useCallback((value: unknown) => {
    apply({ type: "load", value });
    valueRef.current = value;
    pendingDeliverRef.current = true;
    animDoneRef.current = false;
  }, [apply]);

  const complete = useCallback(() => {
    if (phaseRef.current.kind !== "in-flight") return;
    deliverIfPending();
    animDoneRef.current = true;
    tryFinalize();
  }, [deliverIfPending, tryFinalize]);

  useImperativeHandle(ref, () => ({
    load,
    complete,
    get phase() { return phaseRef.current; },
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
  }), [load, complete, destNodeRef, destSlotId]);

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
    let simStart = // vocab-ok: visual pulse animation, not substrate scheduling
      performance.now() - distanceCoveredRef.current / PULSE_SPEED_PX_PER_MS; // vocab-ok: visual layer
    let raf = 0;
    const step = () => {
      if (pauseAxis?.paused) return;
      const elapsed = performance.now() - simStart; // vocab-ok: visual layer
      const distance = Math.min(elapsed * PULSE_SPEED_PX_PER_MS, measuredLen);
      distanceCoveredRef.current = distance;
      const pt = path.getPointAtLength(distance);
      setPulsePos({ x: pt.x, y: pt.y });
      if (distance >= measuredLen) {
        animDoneRef.current = true;
        tryFinalize();
        return;
      }
      raf = requestAnimationFrame(step); // vocab-ok: visual layer
    };
    const unsub = pauseAxis?.subscribe((p) => {
      if (!p) {
        // Rebase sim clock so pulse continues from where it stopped
        simStart = performance.now() - distanceCoveredRef.current / PULSE_SPEED_PX_PER_MS; // vocab-ok: visual layer
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(step); // vocab-ok: visual layer
      }
    });
    raf = requestAnimationFrame(step); // vocab-ok: visual layer
    return () => { cancelAnimationFrame(raf); unsub?.(); };
  }, [phase.kind, arcLength, pathD, tryFinalize, pauseAxis]);

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
