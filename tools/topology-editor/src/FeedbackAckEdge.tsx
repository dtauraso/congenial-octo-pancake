import { EdgeProps, EdgeLabelRenderer, BaseEdge } from "reactflow";
import { KIND_COLORS } from "./schema";

// Routes below the pipeline (down → across → up), mirroring the cascade SVG's
// `i1AckToReadGate` path. Used for `feedback-ack` edges so the cycle-closer
// doesn't cut through pipeline nodes.
const UNDERLINE_OFFSET = 70;

export function FeedbackAckEdge({
  sourceX, sourceY, targetX, targetY, label, style,
}: EdgeProps) {
  const midY = Math.max(sourceY, targetY) + UNDERLINE_OFFSET;
  const path = `M ${sourceX},${sourceY} L ${sourceX},${midY} L ${targetX},${midY} L ${targetX},${targetY}`;
  const labelX = (sourceX + targetX) / 2;
  const labelY = midY;

  return (
    <>
      <BaseEdge path={path} style={{ ...style, stroke: KIND_COLORS["feedback-ack"], fill: "none" }} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY + 14}px)`,
              fontSize: 10, fontWeight: 600, color: KIND_COLORS["feedback-ack"],
              background: "#fafafa", padding: "1px 4px", borderRadius: 3,
              pointerEvents: "all",
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
