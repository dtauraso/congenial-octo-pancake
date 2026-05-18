// Grow-port affordance for PortRim.
// When a wire drag is incoming and all inputs are already connected,
// a ghost "__grow:<side>:<slot>" Handle appears at the nearest free
// snap position under the cursor. Dropping it triggers onConnect,
// which appends a new input port to node.inputs and creates the edge.

import { useState, useEffect } from "react";
import * as React from "react";
import { Handle, Position, useStore } from "reactflow";
import type { Side, SnapPoint } from "./port-rim-drag";
import { SLOT_PCT, computeSnapPoints, nearestSnap, encodeGrowHandle } from "./port-rim-drag";
import type { PortDef } from "./PortRim";

const SIDE_POSITION: Record<Side, Position> = {
  left: Position.Left, right: Position.Right,
  top: Position.Top, bottom: Position.Bottom,
};

function growStyle(side: Side, pct: number): React.CSSProperties {
  const iv = side === "left" || side === "right";
  return {
    [side]: -6,
    ...(iv ? { top: `${pct}%` } : { left: `${pct}%` }),
    width: 10, height: 10,
    background: "rgba(60,180,90,0.85)",
    border: "2px dashed #2a7a2a",
    borderRadius: "50%",
    zIndex: 10,
  } as React.CSSProperties;
}

interface GrowProps {
  nodeId: string;
  inputs: PortDef[];
  width: number;
  height: number;
}

// useGrowSnap: tracks cursor position over the RF node element and
// returns the nearest free snap point while an incoming wire drag is
// in progress and all inputs are filled.
export function useGrowSnap(
  { nodeId, inputs, width, height }: GrowProps,
  connected: Record<string, boolean>,
): SnapPoint | null {
  const [growSnap, setGrowSnap] = useState<SnapPoint | null>(null);

  const isIncomingDrag = useStore((s) => {
    const cn = (s as Record<string, unknown>).connectionNodeId as string | null | undefined;
    return !!cn && cn !== nodeId;
  });

  const allInputsFilled = inputs.length > 0 && inputs.every((p) => connected[p.name]);
  const showGrow = isIncomingDrag && allInputsFilled;

  useEffect(() => {
    if (!showGrow) { setGrowSnap(null); return; }
    const nodeEl = document.querySelector(
      `.react-flow__node[data-id="${nodeId}"]`,
    ) as HTMLElement | null;
    if (!nodeEl) return;

    const onMove = (e: MouseEvent) => {
      const rect = nodeEl.getBoundingClientRect();
      const all = computeSnapPoints(rect, width, height);
      const occupied = new Set(inputs.map((p) => `${p.side ?? "left"}:${p.slot ?? 1}`));
      const free = all.filter((pt) => !occupied.has(`${pt.side}:${pt.slot}`));
      setGrowSnap(nearestSnap(free.length > 0 ? free : all, e.clientX, e.clientY));
    };
    const onLeave = () => setGrowSnap(null);
    nodeEl.addEventListener("mousemove", onMove);
    nodeEl.addEventListener("mouseleave", onLeave);
    return () => {
      nodeEl.removeEventListener("mousemove", onMove);
      nodeEl.removeEventListener("mouseleave", onLeave);
    };
  }, [showGrow, nodeId, inputs, width, height]);

  return showGrow ? growSnap : null;
}

// GrowHandle: renders the ghost target handle at the given snap point.
export function GrowHandle({ snap }: { snap: SnapPoint }) {
  const pct = SLOT_PCT[snap.slot];
  return (
    <Handle
      id={encodeGrowHandle(snap.side, snap.slot)}
      type="target"
      position={SIDE_POSITION[snap.side]}
      style={growStyle(snap.side, pct)}
      title="Drop to add a new input port"
    />
  );
}
