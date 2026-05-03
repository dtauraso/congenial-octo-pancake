import { useEffect, useRef, useState } from "react";
import { BaseEdge, getBezierPath, type EdgeProps } from "reactflow";
import { KIND_COLORS, type EdgeKind } from "../../schema";
import { subscribe, subscribeState, getConcurrentEdges, getTickMs } from "../../sim/runner";

type EdgeData = { kind?: EdgeKind };

// Pulse traversal time, paced relative to the runner's tick interval so
// fan-out flashes don't all complete in 600ms regardless of how slow
// the user has set the slider. Folds in the per-event wall-clock pacing
// polish noted at the bottom of phase-5.5.md.
const PULSE_MIN_MS = 200;
const PULSE_MAX_MS = 1200;
function pulseDurationMs(): number {
  const t = getTickMs();
  return Math.max(PULSE_MIN_MS, Math.min(PULSE_MAX_MS, Math.round(t * 1.2)));
}

// One-shot pulse along the edge's bezier path, retriggered by every
// "emit" event the runner publishes for this edge id. Replaces the
// continuous WAAPI loop of the old playback model.
export function AnimatedEdge(props: EdgeProps<EdgeData>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, data } = props;
  const [d] = getBezierPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
  });

  const pulseRef = useRef<SVGPathElement | null>(null);
  const [concurrent, setConcurrent] = useState(() => getConcurrentEdges().has(id));

  useEffect(() => {
    const update = () => setConcurrent(getConcurrentEdges().has(id));
    update();
    return subscribeState(update);
  }, [id]);

  useEffect(() => {
    const path = pulseRef.current;
    if (!path) return;
    const unsub = subscribe((ev) => {
      if (ev.type !== "emit" || ev.edgeId !== id) return;
      const len = path.getTotalLength();
      // Cancel an in-flight pulse before retriggering so concurrent-edge
      // mode (Chunk D) restarts cleanly instead of compositing.
      path.getAnimations().forEach((a) => a.cancel());
      path.animate(
        [
          { strokeDashoffset: "0", opacity: 1, offset: 0 },
          { strokeDashoffset: `${-len}`, opacity: 1, offset: 0.95 },
          { strokeDashoffset: `${-len}`, opacity: 0, offset: 1 },
        ],
        { duration: pulseDurationMs() },
      );
    });
    return unsub;
  }, [id, d]);

  const stroke = KIND_COLORS[data?.kind ?? "any"] ?? "#888";

  return (
    <>
      <BaseEdge path={d} style={style} interactionWidth={28} />
      {concurrent && (
        <path
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth={6}
          opacity={0.18}
          pointerEvents="none"
        />
      )}
      <path
        ref={pulseRef}
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={3}
        strokeDasharray="20,9999"
        strokeDashoffset={0}
        opacity={0}
        pointerEvents="none"
      />
    </>
  );
}
