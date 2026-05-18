import { useCallback, useRef, useState } from "react";
import { useReactFlow } from "reactflow";
import type { EdgeRoute } from "./Wire";
import { useEdgeActions } from "./edge-actions-ctx";

interface Props {
  edgeId: string;
  route: EdgeRoute;
  pathD: string;
  mid: { x: number; y: number };
  lane: number;
  stroke: string;
}

const HOVER_CLEARANCE_PX = 16;

export function LaneDragHandle({ edgeId, route, pathD, mid, lane, stroke }: Props) {
  const actions = useEdgeActions();
  const rf = useReactFlow();
  const dragRef = useRef<{ startScreenX: number; startScreenY: number; startLane: number } | null>(null);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  const onMouseDown = useCallback((ev: React.MouseEvent<SVGCircleElement>) => {
    if (!actions) return;
    ev.stopPropagation();
    ev.preventDefault();
    dragRef.current = { startScreenX: ev.clientX, startScreenY: ev.clientY, startLane: lane };
    setDragging(true);

    const onMove = (me: MouseEvent) => {
      if (!dragRef.current || !actions) return;
      const origin = rf.screenToFlowPosition({ x: dragRef.current.startScreenX, y: dragRef.current.startScreenY });
      const current = rf.screenToFlowPosition({ x: me.clientX, y: me.clientY });
      const delta = route === "snake"
        ? current.x - origin.x
        : current.y - origin.y; // snake-v and below both drag vertically
      actions.setEdgeLane(edgeId, dragRef.current.startLane + delta);
    };

    const onUp = () => {
      dragRef.current = null;
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [actions, edgeId, lane, rf, route]);

  if (!actions) return null;

  const visible = hovered || dragging;

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={HOVER_CLEARANCE_PX}
        style={{ pointerEvents: "stroke" }}
      />
      {visible && (
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
      )}
    </g>
  );
}
