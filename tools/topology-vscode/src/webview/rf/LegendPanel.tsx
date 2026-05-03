import { KIND_COLORS, type LegendRow } from "../../schema";
import { dashForKind } from "./edge-style";

// Renders spec.legend[] as a fixed-position panel in the canvas
// corner, mirroring the cascade SVG's legend block (style-guide §10).
// Each row shows a short stroked sample of the edge class plus its
// name and description.
export function LegendPanel({ rows }: { rows: LegendRow[] }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div
      className="legend-panel"
      style={{
        position: "absolute",
        right: 12,
        bottom: 12,
        background: "#fafafa",
        border: "1px solid #ddd",
        borderRadius: 4,
        padding: "8px 10px",
        fontSize: 11,
        fontWeight: 300,
        color: "#222",
        pointerEvents: "none",
        zIndex: 5,
        display: "grid",
        gridTemplateColumns: "32px auto auto",
        columnGap: 8,
        rowGap: 3,
        alignItems: "center",
      }}
    >
      <div style={{ gridColumn: "1 / span 3", fontWeight: 600, marginBottom: 2 }}>
        Legend
      </div>
      {rows.map((r, i) => {
        const color = KIND_COLORS[r.kind] ?? "#888";
        const dash = dashForKind(r.kind);
        return (
          <RowFragment key={i} color={color} dash={dash} name={r.name} desc={r.desc} />
        );
      })}
    </div>
  );
}

function RowFragment({
  color, dash, name, desc,
}: { color: string; dash: string | undefined; name: string; desc: string }) {
  return (
    <>
      <svg width={28} height={10} aria-hidden>
        <line
          x1={2} y1={5} x2={26} y2={5}
          stroke={color}
          strokeWidth={1.5}
          strokeDasharray={dash}
        />
      </svg>
      <span style={{ color }}>{name}</span>
      <span style={{ color: "#444" }}>{desc}</span>
    </>
  );
}
