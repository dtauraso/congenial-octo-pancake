// PortRim: renders all 4 sides of a substrate node's port handles.
// Connected ports: pointerdown starts a port-move drag (intercepts RF
// wire-creation). On release, snaps to nearest of 12 positions and
// persists side+slot via mutateSpec/scheduleSave.
// Unconnected ports: pass-through to React Flow new-wire gesture.

import { useRef, useState, useCallback, type PointerEvent } from "react";
import * as React from "react";
import { Handle, Position, useStore, useReactFlow, useUpdateNodeInternals } from "reactflow";
import { shallow } from "zustand/shallow";
import { KIND_COLORS } from "../../schema";
import type { EdgeKind } from "../../schema";
import { mutateSpec } from "../state";
import { scheduleSave } from "../save";
import {
  type Side, type ActiveDrag, SLOT_PCT,
  resolvePositions, computeSnapPoints, nearestSnap, pctToSlot,
} from "./port-rim-drag";

export interface PortDef {
  name: string;
  kind: EdgeKind;
  side?: "left" | "right" | "top" | "bottom";
  slot?: 0 | 1 | 2;
}

const SIDE_POSITION: Record<Side, Position> = {
  left: Position.Left, right: Position.Right,
  top: Position.Top, bottom: Position.Bottom,
};

function handleStyle(side: Side, pct: number, color: string): React.CSSProperties {
  const iv = side === "left" || side === "right";
  return { [side]: -5, ...(iv ? { top: `${pct}%` } : { left: `${pct}%` }),
    width: 8, height: 8, background: color, border: "1px solid #333" } as React.CSSProperties;
}

interface Props {
  nodeId: string;
  inputs: PortDef[];
  outputs: PortDef[];
  width: number;
  height: number;
}

export function PortRim({ nodeId, inputs, outputs, width, height }: Props) {
  const nodeElRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<ActiveDrag | null>(null);
  const rf = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  const connected = useStore((s) => {
    const r: Record<string, boolean> = {};
    for (const p of inputs)  r[p.name] = s.edges.some((e) => e.target === nodeId && e.targetHandle === p.name);
    for (const p of outputs) r[p.name] = s.edges.some((e) => e.source === nodeId && e.sourceHandle === p.name);
    return r;
  }, shallow);

  const handlePointerDown = useCallback((
    e: PointerEvent<HTMLDivElement>, portName: string,
    isInput: boolean, curSide: Side, curSlot: 0 | 1 | 2,
  ) => {
    if (!connected[portName]) return;
    e.stopPropagation(); e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const nodeEl = (e.currentTarget as HTMLElement).closest(".react-flow__node") as HTMLDivElement | null;
    nodeElRef.current = nodeEl;
    setDrag({ portName, isInput, oldSide: curSide, oldSlot: curSlot, nearestSide: curSide, nearestSlot: curSlot });

    const getRect = () => nodeElRef.current?.getBoundingClientRect();
    const onMove = (ev: globalThis.PointerEvent) => {
      const rect = getRect(); if (!rect) return;
      const n = nearestSnap(computeSnapPoints(rect, width, height), ev.clientX, ev.clientY);
      setDrag((d) => d ? { ...d, nearestSide: n.side, nearestSlot: n.slot } : d);
    };
    const onUp = (ev: globalThis.PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const rect = getRect(); if (!rect) { setDrag(null); return; }
      const n = nearestSnap(computeSnapPoints(rect, width, height), ev.clientX, ev.clientY);
      setDrag(null);
      if (n.side === curSide && n.slot === curSlot) return;
      const allRF = [
        ...inputs.map((p) => ({ p, inp: true })),
        ...outputs.map((p) => ({ p, inp: false })),
      ];
      const defSide = (p: PortDef, inp: boolean): Side => (p.side as Side | undefined) ?? (inp ? "left" : "right");
      const occupant = allRF.find(({ p, inp }) =>
        p.name !== portName && defSide(p, inp) === n.side && (p.slot ?? 1) === n.slot
      );
      mutateSpec((s) => {
        const sn = s.nodes.find((nd) => nd.id === nodeId); if (!sn) return;
        const all = [...(sn.inputs ?? []).map((p) => ({ p })), ...(sn.outputs ?? []).map((p) => ({ p }))];
        const dragged = all.find(({ p }) => p.name === portName); if (!dragged) return;
        if (occupant) { const occ = all.find(({ p }) => p.name === occupant.p.name); if (occ) { occ.p.side = curSide; occ.p.slot = curSlot; } }
        dragged.p.side = n.side; dragged.p.slot = n.slot;
      });
      rf.setNodes((nodes) => nodes.map((nd) => {
        if (nd.id !== nodeId) return nd;
        const patch = (p: PortDef): PortDef => {
          if (p.name === portName) return { ...p, side: n.side, slot: n.slot };
          if (occupant && p.name === occupant.p.name) return { ...p, side: curSide, slot: curSlot };
          return p;
        };
        return { ...nd, data: { ...nd.data,
          inputs: (nd.data?.inputs ?? []).map(patch),
          outputs: (nd.data?.outputs ?? []).map(patch),
        } };
      }));
      updateNodeInternals(nodeId);
      scheduleSave();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [connected, inputs, outputs, nodeId, width, height]);

  // Bucket by side
  const buckets: Record<Side, { def: PortDef; isInput: boolean }[]> = { left: [], right: [], top: [], bottom: [] };
  for (const p of inputs)  buckets[(p.side as Side) ?? "left"].push({ def: p, isInput: true });
  for (const p of outputs) buckets[(p.side as Side) ?? "right"].push({ def: p, isInput: false });

  const handles = (["left","right","top","bottom"] as Side[]).flatMap((side) => {
    const bucket = buckets[side];
    const positions = resolvePositions(bucket.map((x) => x.def));
    return bucket.map(({ def: p, isInput }, i) => {
      const pct = positions[i];
      const curSide = (p.side as Side | undefined) ?? (isInput ? "left" : "right");
      const curSlot: 0|1|2 = p.slot ?? pctToSlot(pct);
      return (
        <Handle
          key={`${side}-${p.name}`}
          id={p.name}
          type={isInput ? "target" : "source"}
          position={SIDE_POSITION[side]}
          style={handleStyle(side, pct, KIND_COLORS[p.kind] ?? "#888")}
          onPointerDown={(e) => handlePointerDown(e, p.name, isInput, curSide, curSlot)}
        />
      );
    });
  });

  const snapDots = drag ? (["left","right","top","bottom"] as Side[]).flatMap((side) =>
    ([0,1,2] as const).map((slot) => {
      const pct = SLOT_PCT[slot];
      const isNearest = drag.nearestSide === side && drag.nearestSlot === slot;
      const iv = side === "left" || side === "right";
      const dotStyle: React.CSSProperties = {
        position: "absolute", width: 6, height: 6, borderRadius: "50%",
        background: isNearest ? "rgba(80,160,255,0.9)" : "rgba(120,120,200,0.35)",
        pointerEvents: "none",
        ...(iv ? { [side]: -3, top: `${pct}%`, transform: "translate(-50%,-50%)" }
               : side === "top" ? { top: -3, left: `${pct}%`, transform: "translate(-50%,-50%)" }
               : { bottom: -3, left: `${pct}%`, transform: "translate(-50%,50%)" }),
      };
      return <div key={`snap-${side}-${slot}`} style={dotStyle} />;
    })
  ) : [];

  return <>{handles}{snapDots}</>;
}
