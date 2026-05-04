import { Handle, Position, type NodeProps } from "reactflow";

export type FoldNodeData = {
  label: string;
  collapsed: boolean;
  memberCount: number;
  width: number;
  height: number;
  diffCounts?: { added: number; removed: number; moved: number };
};

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
  if (data.collapsed) {
    return (
      <div
        className="fold-placeholder"
        style={{
          width: data.width,
          height: data.height,
          background: "#f5f0d8",
          border: `${selected ? 2 : 1}px dashed #b89a3c`,
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
        <Handle type="target" position={Position.Left} style={HANDLE_HIDDEN} />
        <Handle type="source" position={Position.Right} style={HANDLE_HIDDEN} />
        <div style={{ fontWeight: 600 }}>{data.label || "fold"}</div>
        <div style={{ opacity: 0.7 }}>{data.memberCount} nodes</div>
        <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}>double-click to expand</div>
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
