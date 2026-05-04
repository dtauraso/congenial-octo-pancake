import { useEffect, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { subscribe, getTickMs } from "../../sim/runner";
import { recordFoldHaloEvent } from "./fold-halo-probe";
import { createFoldActivityTracker, isFoldBoundaryEmit } from "./fold-activity";

const FLASH_DURATION_MS = 300;
const FOLD_STROKE = "#b89a3c";

// Mirror AnimatedNode's portStyle: 8x8 colored dot, half-protruding past
// the edge. The buffered halo (boxShadow) goes on the input dot only,
// matching how member nodes show their per-port "input X waiting" ring.
function foldPortStyle(side: "left" | "right", buffered = false): React.CSSProperties {
  return {
    width: 8, height: 8, minWidth: 0, minHeight: 0,
    [side]: -4, top: "50%",
    transform: "translate(0, -50%)",
    background: FOLD_STROKE, border: "1px solid #fff",
    borderRadius: 4,
    ...(buffered ? { boxShadow: `0 0 0 2px ${FOLD_STROKE}` } : {}),
  };
}

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

function useFoldHaloState(foldId: string, memberIds: string[]): {
  buffered: boolean;
  flashRef: React.MutableRefObject<HTMLDivElement | null>;
  glowRef: React.MutableRefObject<HTMLDivElement | null>;
} {
  const flashRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  // "active" = any member has fired within ACTIVE_GRACE ticks. Each
  // member fire refreshes the timeout; when it expires, the halo turns
  // off. This matches the spec "halo on during member activity, off
  // during none" — independent of whether members happen to use the
  // AND-style __has_<port> buffering convention.
  const [buffered, setBuffered] = useState<boolean>(false);
  useEffect(() => {
    recordFoldHaloEvent(foldId, "mount", foldId, memberIds, false);
    const ids = new Set(memberIds);
    const tracker = createFoldActivityTracker(
      Math.round(getTickMs() * 1.5),
      (active) => {
        recordFoldHaloEvent(foldId, active ? "start" : "end", active ? "(fire)" : "(decay)", memberIds);
        setBuffered(active);
      },
    );
    const unsub = subscribe((ev) => {
      if (ev.type === "emit") {
        if (isFoldBoundaryEmit(ids, ev.fromNodeId, ev.toNodeId)) {
          const fl = flashRef.current;
          if (fl) {
            fl.getAnimations().forEach((a) => a.cancel());
            fl.animate(
              [{ opacity: 0 }, { opacity: 0.5, offset: 0.5 }, { opacity: 0 }],
              { duration: FLASH_DURATION_MS },
            );
          }
          const gl = glowRef.current;
          if (gl) {
            gl.getAnimations().forEach((a) => a.cancel());
            gl.animate(
              [
                { boxShadow: `0 0 0 0 ${FOLD_STROKE}00`, opacity: 0 },
                { boxShadow: `0 0 0 4px ${FOLD_STROKE}cc`, opacity: 0.8, offset: 0.4 },
                { boxShadow: `0 0 0 2px ${FOLD_STROKE}66`, opacity: 0.4, offset: 0.7 },
                { boxShadow: `0 0 0 0 ${FOLD_STROKE}00`, opacity: 0 },
              ],
              { duration: FLASH_DURATION_MS },
            );
          }
        }
        return;
      }
      if (ev.type !== "fire" || !ids.has(ev.nodeId)) return;
      const wasActive = tracker.isActive();
      tracker.noteFire();
      if (wasActive) recordFoldHaloEvent(foldId, "fire", ev.nodeId, memberIds);
    });
    return () => {
      tracker.dispose();
      unsub();
    };
  }, [foldId, memberIds]);
  return { buffered, flashRef, glowRef };
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
  const { buffered, flashRef, glowRef } = useFoldHaloState(props.id, data.memberIds);
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
        }}
      >
        <div
          ref={glowRef}
          style={{
            position: "absolute",
            inset: -2,
            borderRadius: 8,
            pointerEvents: "none",
            opacity: 0,
          }}
        />
        <div
          ref={flashRef}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 6,
            background: FOLD_STROKE,
            pointerEvents: "none",
            opacity: 0,
          }}
        />
        <Handle type="target" position={Position.Left} style={foldPortStyle("left", buffered)} />
        <Handle type="source" position={Position.Right} style={foldPortStyle("right", false)} />
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
