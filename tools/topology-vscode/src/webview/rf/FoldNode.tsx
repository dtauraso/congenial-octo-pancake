import { useEffect, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { subscribeAnim } from "./timeline-probe";
import { recordFoldHaloEvent } from "./fold-halo-probe";
import { isFoldBoundaryEmit } from "./fold-activity";

const FOLD_STROKE = "#b89a3c";
const FOLD_HALO_BOX_SHADOW = `0 0 0 2px ${FOLD_STROKE}`;

export type FoldNodeData = {
  label: string;
  collapsed: boolean;
  memberCount: number;
  memberIds: string[];
  width: number;
  height: number;
  diffCounts?: { added: number; removed: number; moved: number };
};

// ----- Slice 2: halo timing/state -----
// Owns when the fold halo turns on/off and when one-shot flash/glow fire,
// driven by member-node fire events on the runner. Returns refs the
// rendering slice mounts wherever it wants the visual to appear, plus a
// boolean for the persistent buffered halo. Decoupling lets slice 1
// (where the halo lives in the DOM) and this slice evolve independently.

function useFoldHaloState(foldId: string, memberIds: string[]): { buffered: boolean } {
  // Halo bound to animation lifecycle, not simulator events. The
  // simulator fires receives at sim-instant times (often 0ms after the
  // emit), so the model "received" before the user's eyes see the
  // pulse arrive. Anchoring the halo to anim-end (inward) and
  // anim-start (outward) means the halo flips when the user sees the
  // pulse cross the boundary. Closes the model/view temporal-
  // decoupling instance for the halo.
  //
  //  - anim-end on outside→member edge:  pulse visually arrived → on
  //  - anim-start on member→outside edge: pulse visually departing → off
  //
  // Pause is free: the runner gates the rAF loop on play state, so
  // anim-start/anim-end don't fire while paused.
  const [buffered, setBuffered] = useState<boolean>(false);
  useEffect(() => {
    const members = new Set(memberIds);
    let active = false;
    recordFoldHaloEvent(foldId, "mount", foldId, memberIds, false);
    return subscribeAnim((ev) => {
      if (!isFoldBoundaryEmit(members, ev.fromNodeId, ev.toNodeId)) return;
      const inward = members.has(ev.toNodeId);
      // Inward: visual arrival = anim-end. Outward: visual departure
      // = anim-start. Other combos (anim-start inward, anim-end
      // outward) aren't the perceptual moment; ignore them.
      const isOnTrigger = inward && ev.kind === "anim-end";
      const isOffTrigger = !inward && ev.kind === "anim-start";
      if (!isOnTrigger && !isOffTrigger) return;
      const next = isOnTrigger;
      if (next === active) return;
      active = next;
      recordFoldHaloEvent(
        foldId,
        active ? "start" : "end",
        inward ? ev.toNodeId : ev.fromNodeId,
        memberIds,
      );
      setBuffered(active);
    });
  }, [foldId, memberIds]);
  return { buffered };
}

function DiffBadge({ counts }: { counts: { added: number; removed: number; moved: number } }) {
  const parts: Array<{ text: string; color: string }> = [];
  if (counts.added) parts.push({ text: `+${counts.added}`, color: "#2e7d32" });
  if (counts.removed) parts.push({ text: `−${counts.removed}`, color: "#c62828" });
  if (counts.moved) parts.push({ text: `~${counts.moved}`, color: "#c98a00" });
  if (parts.length === 0) return null;
  return (
    <div
      style={{
        position: "absolute", top: -8, right: -6,
        display: "flex", gap: 3,
        background: "#fff", border: "1px solid #bbb", borderRadius: 8,
        padding: "1px 5px", fontSize: 9, fontWeight: 700,
        boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
        pointerEvents: "none",
      }}
      title="members differ vs. comparison spec"
    >
      {parts.map((p, i) => (
        <span key={i} style={{ color: p.color }}>{p.text}</span>
      ))}
    </div>
  );
}

const HANDLE_HIDDEN: React.CSSProperties = {
  width: 1, height: 1, minWidth: 0, minHeight: 0,
  background: "transparent", border: "none", pointerEvents: "none",
};

export function FoldNode(props: NodeProps<FoldNodeData>) {
  const { data, selected } = props;
  // Slice 2 owns when/why these change; slice 1 (below) owns where they
  // mount and what they look like.
  const { buffered } = useFoldHaloState(props.id, data.memberIds);
  if (data.collapsed) {
    return (
      <div
        className="fold-placeholder"
        style={{
          width: data.width,
          height: data.height,
          background: "#f5f0d8",
          border: `${selected ? 2 : 1}px dashed ${FOLD_STROKE}`,
          borderRadius: 6,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          color: "#5a4a14",
          boxSizing: "border-box",
          cursor: "pointer",
          position: "relative",
          ...(buffered ? { boxShadow: FOLD_HALO_BOX_SHADOW } : {}),
        }}
      >
        <Handle type="target" position={Position.Left} style={HANDLE_HIDDEN} />
        <Handle type="source" position={Position.Right} style={HANDLE_HIDDEN} />
        <div style={{ fontWeight: 600, position: "relative", zIndex: 1 }}>{data.label || "fold"}</div>
        <div style={{ opacity: 0.7, position: "relative", zIndex: 1 }}>{data.memberCount} nodes</div>
        <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2, position: "relative", zIndex: 1 }}>double-click to expand</div>
        {data.diffCounts && <DiffBadge counts={data.diffCounts} />}
      </div>
    );
  }
  return (
    <div
      className="fold-frame"
      style={{
        width: data.width,
        height: data.height,
        background: "rgba(245, 240, 216, 0.35)",
        border: "1px dashed #b89a3c",
        borderRadius: 8,
        boxSizing: "border-box",
        pointerEvents: "none",
        ...(buffered ? { boxShadow: FOLD_HALO_BOX_SHADOW } : {}),
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -10,
          left: 8,
          background: "#f5f0d8",
          border: "1px solid #b89a3c",
          borderRadius: 4,
          padding: "1px 6px",
          fontSize: 10,
          color: "#5a4a14",
          pointerEvents: "auto",
          cursor: "pointer",
        }}
        title="double-click to collapse · delete to remove"
      >
        {data.label || "fold"}
      </div>
    </div>
  );
}
