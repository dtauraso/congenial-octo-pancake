import type { EdgeKind } from "../../../schema";

export function EdgeLabels({
  mid, label, valueLabel, kind, stroke,
}: {
  mid: { x: number; y: number } | null;
  label?: string;
  valueLabel?: string;
  kind: EdgeKind | "any";
  stroke: string;
}) {
  if (!mid) return null;
  return (
    <>
      {label && (
        <text
          x={mid.x}
          y={mid.y - 6}
          textAnchor="middle"
          fontSize={12}
          fontWeight={kind === "feedback-ack" ? 600 : 300}
          fill="#111"
          stroke="none"
          pointerEvents="none"
        >
          {kind === "feedback-ack" ? `↻ ${label}` : label}
        </text>
      )}
      {valueLabel && (
        <text
          x={mid.x}
          y={mid.y + (label ? 10 : -6)}
          textAnchor="middle"
          fontSize={12}
          fontWeight={300}
          fill={stroke}
          stroke="none"
          pointerEvents="none"
        >
          {valueLabel}
        </text>
      )}
    </>
  );
}
