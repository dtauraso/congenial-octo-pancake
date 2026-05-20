// RF custom edge — static path rendering.
// Uses RF's getBezierPath and BaseEdge. No pulse animation (Phase 4).
// Kind colour and label mirror the substrate-r edge style.

import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "reactflow";
import { KIND_COLORS } from "../../../schema";
import type { EdgeKind } from "../../../schema/types";

interface SubstrateEdgeData {
  kind?: EdgeKind;
  label?: string;
  valueLabel?: string;
}

function dashForKind(kind: EdgeKind | undefined): string | undefined {
  return kind === "pointer" ? "4 3" : undefined;
}

export function SubstrateEdge({
  id,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data,
  markerEnd,
}: EdgeProps<SubstrateEdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const kind: EdgeKind = data?.kind ?? "any";
  const stroke = KIND_COLORS[kind] ?? "#888";
  const dash = dashForKind(kind);
  const displayLabel = data?.valueLabel ?? data?.label;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ stroke, strokeDasharray: dash, strokeWidth: 1.5 }}
      />
      {displayLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 10,
              fontFamily: "monospace",
              color: stroke,
              background: "#0d1117",
              padding: "1px 4px",
              borderRadius: 2,
              pointerEvents: "none",
            }}
            className="nodrag nopan"
          >
            {displayLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
