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
  forwardRef, useCallback, useImperativeHandle, useRef, useState,
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

// ── WireLoop ────────────────────────────────────────────────────────
// Owns the RAF animation loop. Constructed once per path element
// (via ref callback). Calling start() re-arms on each load; calling
// dispose() tears down on detach.

class WireLoop {
  private path: SVGPathElement;
  private arcLength: number | undefined;
  private pauseAxis: PauseAxis | undefined;
  private getPhaseKind: () => string;
  private getPendingDeliver: () => boolean;
  private setAnimDone: (v: boolean) => void;
  private tryFinalize: () => void;
  private traceId: string | undefined;

  private distanceCovered = 0;
  private raf = 0;
  private simStart = 0; // vocab-ok: visual pulse animation, not substrate scheduling
  private unsub: (() => void) | undefined;
  private groupEl: SVGGElement | null = null;

  constructor(opts: {
    path: SVGPathElement;
    arcLength: number | undefined;
    pauseAxis: PauseAxis | undefined;
    getPhaseKind: () => string;
    getPendingDeliver: () => boolean;
    setAnimDone: (v: boolean) => void;
    tryFinalize: () => void;
    traceId: string | undefined;
  }) {
    this.path = opts.path;
    this.arcLength = opts.arcLength;
    this.pauseAxis = opts.pauseAxis;
    this.getPhaseKind = opts.getPhaseKind;
    this.getPendingDeliver = opts.getPendingDeliver;
    this.setAnimDone = opts.setAnimDone;
    this.tryFinalize = opts.tryFinalize;
    this.traceId = opts.traceId;
  }

  setGroup(el: SVGGElement | null) { this.groupEl = el; }

  updateArcLength(v: number | undefined) { this.arcLength = v; }
  updatePauseAxis(v: PauseAxis | undefined) {
    this.unsub?.();
    this.pauseAxis = v;
    if (this.raf !== 0) this._subscribePause();
  }

  start() {
    // Cancel any in-progress loop then restart cleanly.
    cancelAnimationFrame(this.raf);
    this.unsub?.();
    this.unsub = undefined;
    this.distanceCovered = 0;
    const measuredLen = this.arcLength ?? this.path.getTotalLength();
    this.simStart = performance.now(); // vocab-ok: visual layer
    this._subscribePause();
    this.raf = requestAnimationFrame(() => this._step(measuredLen)); // vocab-ok: visual layer
  }

  private _subscribePause() {
    this.unsub = this.pauseAxis?.subscribe((p) => {
      if (!p) {
        // Rebase sim clock so pulse continues from where it stopped
        this.simStart = performance.now() - this.distanceCovered / PULSE_SPEED_PX_PER_MS; // vocab-ok: visual layer
        cancelAnimationFrame(this.raf);
        const measuredLen = this.arcLength ?? this.path.getTotalLength();
        this.raf = requestAnimationFrame(() => this._step(measuredLen)); // vocab-ok: visual layer
      }
    });
  }

  private _step(measuredLen: number) {
    if (this.pauseAxis?.paused) return;
    const elapsed = performance.now() - this.simStart; // vocab-ok: visual layer
    const distance = Math.min(elapsed * PULSE_SPEED_PX_PER_MS, measuredLen);
    this.distanceCovered = distance;
    if (this.traceId) {
      const pct = measuredLen > 0 ? distance / measuredLen : 0;
      const prevPct = measuredLen > 0 ? (distance - elapsed * PULSE_SPEED_PX_PER_MS) / measuredLen : 0;
      const completed = prevPct < 1.0 && pct >= 1.0;
      if (completed) {
        postLog("trace.wire.step", { traceId: this.traceId, elapsed, distance, measuredLen });
      }
    }
    const pt = this.path.getPointAtLength(distance);
    if (this.groupEl) {
      this.groupEl.setAttribute("transform", `translate(${pt.x},${pt.y})`);
    }
    if (distance >= measuredLen) {
      this.setAnimDone(true);
      this.tryFinalize();
      // Deferred-deliver: if delivery is still pending (dest slot full),
      // keep the RAF loop running so tryFinalize retries each frame.
      if (this.getPendingDeliver()) {
        this.raf = requestAnimationFrame(() => this._step(measuredLen)); // vocab-ok: visual layer
      } else {
        this.raf = 0;
      }
      return;
    }
    this.raf = requestAnimationFrame(() => this._step(measuredLen)); // vocab-ok: visual layer
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.unsub?.();
    this.unsub = undefined;
  }
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
  const wireLoopRef = useRef<WireLoop | null>(null);

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
    // Deferred-deliver safety net: if dest slot is still filled,
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
    // filled), stay in-flight so the RAF retry loop keeps calling tryFinalize
    // each frame until delivery succeeds.
    if (pendingDeliverRef.current) return;
    animDoneRef.current = false;
    apply({ type: "arrive" });
  }, [apply, deliverIfPending]);

  // Keep tryFinalize ref current so WireLoop always calls the latest closure.
  const tryFinalizeRef = useRef(tryFinalize);
  tryFinalizeRef.current = tryFinalize;

  const load = useCallback((v: unknown) => {
    if (phaseRef.current.kind !== "empty") return; // silent no-op: wire in-flight; body retries next poll
    if (traceId) postLog("trace.load", { wire: traceId, value: v });
    apply({ type: "load", value: v });
    valueRef.current = v;
    pendingDeliverRef.current = true;
    animDoneRef.current = false;
    wireLoopRef.current?.start();
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

  // Seed: init-ref guard — runs inline on first render, not in useEffect.
  const seededRef = useRef(false);
  if (!seededRef.current) {
    seededRef.current = true;
    if (seed !== undefined) load(value !== undefined ? value : seed);
  }

  // Keep pauseAxis up to date on the loop when it changes between renders.
  const prevPauseAxisRef = useRef(pauseAxis);
  if (prevPauseAxisRef.current !== pauseAxis) {
    prevPauseAxisRef.current = pauseAxis;
    wireLoopRef.current?.updatePauseAxis(pauseAxis);
  }

  // Keep arcLength up to date.
  const prevArcLengthRef = useRef(arcLength);
  if (prevArcLengthRef.current !== arcLength) {
    prevArcLengthRef.current = arcLength;
    wireLoopRef.current?.updateArcLength(arcLength);
  }

  // Ref callback for the <path> element — constructs/disposes WireLoop.
  const pathRefCallback = useCallback((el: SVGPathElement | null) => {
    if (wireLoopRef.current) {
      wireLoopRef.current.dispose();
      wireLoopRef.current = null;
    }
    if (!el) return;
    wireLoopRef.current = new WireLoop({
      path: el,
      arcLength,
      pauseAxis,
      getPhaseKind: () => phaseRef.current.kind,
      getPendingDeliver: () => pendingDeliverRef.current,
      setAnimDone: (v) => { animDoneRef.current = v; },
      tryFinalize: () => tryFinalizeRef.current(),
      traceId,
    });
    // If load() already ran (e.g. seed during initial render, before this
    // ref callback fired), the wire is in-flight with a pending delivery
    // but the loop never got a start() call. Start it now.
    if (pendingDeliverRef.current && phaseRef.current.kind === "in-flight") {
      wireLoopRef.current.start();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only; loop updates itself via updateArcLength/updatePauseAxis

  return (
    <g>
      <path
        ref={pathRefCallback}
        d={pathD}
        stroke={stroke}
        fill="none"
        strokeWidth={1.5}
        strokeDasharray={strokeDasharray}
        markerEnd={markerEnd}
      />
      {phase.kind === "in-flight" && (
        <g ref={(el) => wireLoopRef.current?.setGroup(el)}>
          <circle cx={0} cy={0} r={4} fill={stroke} />
          <text
            x={6}
            y={-6}
            fontSize={10}
            fill={stroke}
            style={{ pointerEvents: "none", userSelect: "none" }}
            data-testid={traceId ? `riding-label-${traceId}` : undefined}
          >
            {formatRidingLabel(phase.value)}
          </text>
        </g>
      )}
    </g>
  );
});
