import type { NodeProps } from "reactflow";

// Floating annotation box for spec.notes[] — the cascade SVG's
// behavior-note-* blocks. Style per docs/svg-style-guide.md §10:
// fill #fff9c4, stroke #f9a825, text #f57f17. Notes are decorative;
// no handles, not connectable.
export type NoteNodeData = {
  text: string;
  width: number;
  height: number;
};

export function NoteNode(props: NodeProps<NoteNodeData>) {
  const { data } = props;
  return (
    <div
      style={{
        width: data.width,
        minHeight: data.height,
        background: "#fff9c4",
        border: "1px solid #f9a825",
        borderRadius: 4,
        color: "#f57f17",
        fontSize: 11,
        fontWeight: 300,
        padding: "6px 8px",
        whiteSpace: "pre-wrap",
        boxSizing: "border-box",
        pointerEvents: "none",
      }}
    >
      {data.text}
    </div>
  );
}
