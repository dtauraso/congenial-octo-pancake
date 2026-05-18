import { useCallback, useRef } from "react";
import { useReactFlow } from "reactflow";
import type { EdgeRoute } from "./Wire";
import { useEdgeActions } from "./edge-actions-ctx";

interface Props {
  edgeId: string;
  route: EdgeRoute;
  mid: { x: number; y: number };
  lane: number;
  stroke: string;
}

export function LaneDragHandle({ edgeId, route, mid, lane, stroke }: Props) {
  const actions = useEdgeActions();
  const rf = useReactFlow();
  const dragRef = useRef<{ startScreenX: number; startScreenY: number; startLane: number } | null>(null);

  const onMouseDown = useCallback((ev: React.MouseEvent<SVGCircleElement>) => {
    if (!actions) return;
    ev.stopPropagation();
    ev.preventDefault();
    dragRef.current = { startScreenX: ev.clientX, startScreenY: ev.clientY, startLane: lane };

    const onMove = (me: MouseEvent) => {
      if (!dragRef.current || !actions) return;
      const origin = rf.screenToFlowPosition({ x: dragRef.current.startScreenX, y: dragRef.current.startScreenY });
      const current = rf.screenToFlowPosition({ x: me.clientX, y: me.clientY });
      const delta = route === "snake"
        ? current.x - origin.x
        : current.y - origin.y;
      actions.setEdgeLane(edgeId, dragRef.current.startLane + delta);
    };

    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [actions, edgeId, lane, rf, route]);

  if (!actions) return null;

  return (
    <circle
      cx={mid.x}
      cy={mid.y}
      r={5}
      fill={stroke}
      fillOpacity={0.5}
      stroke={stroke}
      strokeWidth={1}
      style={{ cursor: route === "snake" ? "ew-resize" : "ns-resize", pointerEvents: "all" }}
      onMouseDown={onMouseDown}
    />
  );
}
