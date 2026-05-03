import { useEffect, useRef } from "react";
import { BaseEdge, getBezierPath, type EdgeProps } from "reactflow";
import { KIND_COLORS, type EdgeKind } from "../../schema";
import { getDuration, registerAnimation } from "../playback";

type PulseData = { td: number; ta: number };
type EdgeData = { kind?: EdgeKind; pulse?: PulseData };

export function AnimatedEdge(props: EdgeProps<EdgeData>) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, data } = props;
  const [d] = getBezierPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
  });

  const pulseRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    const path = pulseRef.current;
    const pulse = data?.pulse;
    if (!path || !pulse) return;
    const len = path.getTotalLength();
    const durMs = getDuration();
    const eps = 0.001;
    const td = pulse.td;
    const ta = pulse.ta;
    const tdLow = Math.max(0, td - eps);
    const taHigh = Math.min(1, ta + eps);
    const a = path.animate(
      [
        { strokeDashoffset: "0", opacity: 0, offset: 0 },
        { strokeDashoffset: "0", opacity: 0, offset: tdLow },
        { strokeDashoffset: "0", opacity: 1, offset: td },
        { strokeDashoffset: `${-len}`, opacity: 1, offset: ta },
        { strokeDashoffset: `${-len}`, opacity: 0, offset: taHigh },
        { strokeDashoffset: `${-len}`, opacity: 0, offset: 1 },
      ],
      { duration: durMs, iterations: Infinity }
    );
    return registerAnimation(a);
  }, [d, data?.pulse?.td, data?.pulse?.ta]);

  const stroke = KIND_COLORS[data?.kind ?? "any"] ?? "#888";

  return (
    <>
      <BaseEdge path={d} style={style} />
      {data?.pulse && (
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
      )}
    </>
  );
}
