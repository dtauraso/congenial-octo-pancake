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
} from "react";
import type { RefObject } from "react";
import type { NodeHandle } from "./Node";
import type { PauseAxis } from "./pause-axis";
import { postLog } from "../log/post";

const PULSE_SPEED_PX_PER_MS = 0.08;

// ── Wire phase reducer ──────────────────────────────────────────────
// Under the slot-in-node model the wire is transient: load enters
// in-flight, arrive returns to empty. Value lives on the destination
// slot, not the wire.
//
//   empty     -> load   -> in-flight(v)
//   in-flight -> arrive -> empty

export type Phase =
  | { kind: "empty" }
  | { kind: "in-flight"; value: unknown };

export type Action =
  | { type: "load"; value: unknown }
  | { type: "arrive" };

export const initialPhase: Phase = { kind: "empty" };

export function wirePhaseReducer(p: Phase, a: Action): Phase {
  switch (a.type) {
    case "load":
      // load() guards this call — reducer only reached when phase is empty
      return { kind: "in-flight", value: a.value };
    case "arrive":
      if (p.kind !== "in-flight") throw new Error(`wire: arrive while ${p.kind}`);
      return { kind: "empty" };
  }
}

// ── Edge path geometry ──────────────────────────────────────────────
// Three route variants: line (bezier via RF control points), snake
// (mid-x dogleg), below (corridor under both endpoints). Arc length
// is measured from the live <path> during animation.

export type EdgeRoute = "line" | "snake" | "below";

function controlOffset(distance: number): number {
  return distance >= 0 ? 0.5 * distance : 0.25 * 25 * Math.sqrt(-distance);
}

function controlPoint(pos: string, x1: number, y1: number, x2: number, y2: number) {
  switch (pos) {
    case "left":   return { x: x1 - controlOffset(x1 - x2), y: y1 };
    case "right":  return { x: x1 + controlOffset(x2 - x1), y: y1 };
    case "top":    return { x: x1, y: y1 - controlOffset(y1 - y2) };
    case "bottom": return { x: x1, y: y1 + controlOffset(y2 - y1) };
    default:       return { x: x1, y: y1 };
  }
}

function snakeD(sx: number, sy: number, tx: number, ty: number, lane: number): string {
  const midX = (sx + tx) / 2 + lane;
  const r = Math.min(15, Math.abs(midX - sx) / 2, Math.abs(tx - midX) / 2, Math.abs(ty - sy) / 2);
  if (!(r > 0.5)) {
    return `M ${sx},${sy} L ${midX},${sy} L ${midX},${ty} L ${tx},${ty}`;
  }
  const sxDir = midX >= sx ? 1 : -1;
  const yDir  = ty   >= sy ? 1 : -1;
  const txDir = tx   >= midX ? 1 : -1;
  return (
    `M ${sx},${sy} ` +
    `L ${midX - sxDir * r},${sy} ` +
    `Q ${midX},${sy} ${midX},${sy + yDir * r} ` +
    `L ${midX},${ty - yDir * r} ` +
    `Q ${midX},${ty} ${midX + txDir * r},${ty} ` +
    `L ${tx},${ty}`
  );
}

function belowD(sx: number, sy: number, tx: number, ty: number, lane: number): string {
  const corridorY = Math.max(sy, ty) + 80 + lane;
  const r = Math.min(15, Math.abs(corridorY - sy) / 2, Math.abs(corridorY - ty) / 2, Math.abs(tx - sx) / 2);
  if (!(r > 0.5)) {
    return `M ${sx},${sy} L ${sx},${corridorY} L ${tx},${corridorY} L ${tx},${ty}`;
  }
  const xDir = tx >= sx ? 1 : -1;
  return (
    `M ${sx},${sy} ` +
    `L ${sx},${corridorY - r} ` +
    `Q ${sx},${corridorY} ${sx + xDir * r},${corridorY} ` +
    `L ${tx - xDir * r},${corridorY} ` +
    `Q ${tx},${corridorY} ${tx},${corridorY - r} ` +
    `L ${tx},${ty}`
  );
}

export function buildEdgePathD(
  route: EdgeRoute,
  sx: number, sy: number, sp: string,
  tx: number, ty: number, tp: string,
  lane: number,
): string {
  if (route === "snake") return snakeD(sx, sy, tx, ty, lane);
  if (route === "below") return belowD(sx, sy, tx, ty, lane);
  const c1 = controlPoint(sp, sx, sy, tx, ty);
  const c2 = controlPoint(tp, tx, ty, sx, sy);
  return `M ${sx},${sy} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${tx},${ty}`;
}

export function edgeMidpoint(
  route: EdgeRoute,
  sx: number, sy: number, tx: number, ty: number, lane: number,
): { x: number; y: number } {
  if (route === "snake") return { x: (sx + tx) / 2 + lane, y: (sy + ty) / 2 };
  if (route === "below") return { x: (sx + tx) / 2, y: Math.max(sy, ty) + 80 + lane };
  return { x: (sx + tx) / 2, y: (sy + ty) / 2 };
}

// ── Edge labels (mid-path text) ─────────────────────────────────────

export function EdgeLabels({
  mid, label, valueLabel, stroke,
}: {
  mid: { x: number; y: number } | null;
  label?: string;
  valueLabel?: string;
  stroke: string;
}) {
  if (!mid || (!label && !valueLabel)) return null;
  return (
    <>
      {label && (
        <text x={mid.x} y={mid.y - 6} textAnchor="middle" fontSize={12} fontWeight={300}
              fill="#111" stroke="none" pointerEvents="none">{label}</text>
      )}
      {valueLabel && (
        <text x={mid.x} y={mid.y + (label ? 10 : -6)} textAnchor="middle" fontSize={12} fontWeight={300}
              fill={stroke} stroke="none" pointerEvents="none">{valueLabel}</text>
      )}
    </>
  );
}

// Render the in-flight value as a riding label.
function formatRidingLabel(value: unknown): string {
  return String(value);
}

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
  traceId?: string;
  seed?: unknown;
  value?: unknown;
}

export const Wire = forwardRef<WireHandle, WireProps>(function Wire(
  { pathD, arcLength, stroke = "#888", strokeDasharray, markerEnd, destNodeRef, destSlotId, pauseAxis, traceId, seed, value }, ref,
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
    const dest = destNodeRef.current;
    if (!dest) return;
    // Deferred-deliver safety net (step 6/9): if dest slot is still filled,
    // keep pending and wait for the next RAF retry rather than throwing.
    if (dest.slotPhase(destSlotId) !== "empty") return;
    pendingDeliverRef.current = false;
    if (traceId) postLog("trace.deliver", { wire: traceId, slot: destSlotId, value: valueRef.current });
    dest.fill(destSlotId, valueRef.current);
  }, [destNodeRef, destSlotId, traceId]);

  const tryFinalize = useCallback(() => {
    if (phaseRef.current.kind !== "in-flight") return;
    if (!animDoneRef.current) return;
    deliverIfPending();
    // Deferred-deliver: if deliverIfPending() was a no-op (dest slot still
    // filled), stay in-flight so the RAF retry loop in the animation effect
    // keeps calling tryFinalize each frame until delivery succeeds.
    if (pendingDeliverRef.current) return;
    animDoneRef.current = false;
    apply({ type: "arrive" });
  }, [apply, deliverIfPending]);

  const load = useCallback((value: unknown) => {
    if (phaseRef.current.kind !== "empty") return; // silent no-op: wire in-flight; body retries next poll
    if (traceId) postLog("trace.load", { wire: traceId, value });
    apply({ type: "load", value });
    valueRef.current = value;
    pendingDeliverRef.current = true;
    animDoneRef.current = false;
  }, [apply, traceId]);

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

  useEffect(() => {
    if (seed !== undefined) {
      // value overrides seed if both present; seed is the fallback.
      load(value !== undefined ? value : seed);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only: prime the wire once

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
        // Deferred-deliver: if delivery is still pending (dest slot full),
        // keep the RAF loop running so tryFinalize retries each frame.
        if (pendingDeliverRef.current) {
          raf = requestAnimationFrame(step); // vocab-ok: visual layer
        }
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
            data-testid={traceId ? `riding-label-${traceId}` : undefined}
          >
            {formatRidingLabel(phase.value)}
          </text>
        </>
      )}
    </g>
  );
});
