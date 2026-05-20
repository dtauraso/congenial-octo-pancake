import type { EdgeKind } from "../../../schema";
import { rfGetEdges } from "../rf-imperative";
import { EDGE_KIND_OPTIONS } from "./_constants";

export function EdgeContextMenu({
  x, y, edgeId, onPick,
}: {
  x: number;
  y: number;
  edgeId: string;
  onPick: (edgeId: string, kind: EdgeKind) => void;
}) {
  const currentKind = rfGetEdges().find((e) => e.id === edgeId)?.data?.kind as EdgeKind | undefined;
  return (
    <div
      className="edge-context-menu"
      style={{ position: "absolute", left: x, top: y, zIndex: 10 }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="edge-context-menu-header">edge kind</div>
      {EDGE_KIND_OPTIONS.map((k) => (
        <button
          key={k}
          type="button"
          className={"edge-context-menu-item" + (k === currentKind ? " active" : "")}
          onClick={() => onPick(edgeId, k)}
        >
          {k}
        </button>
      ))}
    </div>
  );
}
