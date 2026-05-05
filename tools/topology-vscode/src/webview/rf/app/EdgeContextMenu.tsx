import type { EdgeKind } from "../../../schema";
import { spec } from "../../state";
import { EDGE_KIND_OPTIONS } from "./_constants";

export function EdgeContextMenu({
  x, y, edgeId, onPick,
}: {
  x: number;
  y: number;
  edgeId: string;
  onPick: (edgeId: string, kind: EdgeKind) => void;
}) {
  const currentKind = spec.edges.find((e) => e.id === edgeId)?.kind;
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
