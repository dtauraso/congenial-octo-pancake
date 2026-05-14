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
        <text
          x={mid.x}
          y={mid.y - 6}
          textAnchor="middle"
          fontSize={12}
          fontWeight={300}
          fill="#111"
          stroke="none"
          pointerEvents="none"
        >
          {label}
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
