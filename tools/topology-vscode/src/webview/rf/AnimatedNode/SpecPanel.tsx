import { useMemo, useState } from "react";
import { mutateSpec, useSpec } from "../../state";
import { outgoingEdgeColors } from "../spec-colors";
import type { AnimatedNodeData } from "./_types";

// Inline spec/notes panel. Spec is AI-authored prose; notes is human
// (rendered editable). outputRef segments resolve to the live outgoing edge's
// kind color so renaming an edge recolors prose automatically. Expansion is
// pure presentation — local useState, not persisted.
export function SpecPanel({ id, data }: { id: string; data: AnimatedNodeData }) {
  const [expanded, setExpanded] = useState(false);
  const spec = useSpec();
  const edgeColorById = useMemo(() => outgoingEdgeColors(spec, id), [spec, id]);
  const hasContent = (data.spec && data.spec.segments.length > 0) || !!data.notes;

  const chevronBtn = (
    <button
      className="node-chevron-btn"
      title={expanded ? "hide spec" : "show spec"}
      onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
      style={{
        position: "absolute",
        top: -10,
        right: -10,
        width: 18,
        height: 18,
        padding: 0,
        fontSize: 10,
        lineHeight: "18px",
        textAlign: "center",
        borderRadius: 9,
        border: `1px solid ${data.stroke}`,
        background: hasContent ? data.stroke : "#fff",
        color: hasContent ? "#fff" : data.stroke,
        cursor: "pointer",
        zIndex: 2,
      }}
    >
      {expanded ? "▴" : "▾"}
    </button>
  );

  const panel = expanded ? (
    <div
      className="node-spec-panel"
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        marginTop: 4,
        minWidth: data.width,
        maxWidth: 320,
        padding: "6px 8px",
        background: "#fff",
        border: `1px solid ${data.stroke}`,
        borderRadius: 4,
        fontFamily: "monospace",
        fontSize: 10,
        color: "#1a1a1a",
        whiteSpace: "pre-wrap",
        zIndex: 3,
      }}
    >
      {data.spec && data.spec.segments.length > 0 ? (
        <div>
          {data.spec.segments.map((seg, i) =>
            "text" in seg ? (
              <span key={i}>{seg.text}</span>
            ) : (
              <span key={i} style={{ color: edgeColorById.get(seg.outputRef) ?? "#888", fontWeight: 600 }}>
                {seg.outputRef}
              </span>
            ),
          )}
        </div>
      ) : (
        <div style={{ color: "#888", fontStyle: "italic" }}>(no spec)</div>
      )}
      <textarea
        className="node-notes-textarea"
        value={data.notes ?? ""}
        placeholder="notes"
        onChange={(e) => {
          const next = e.target.value;
          mutateSpec((s) => {
            const node = s.nodes.find((n) => n.id === id);
            if (!node) return;
            if (next === "") delete node.notes;
            else node.notes = next;
          });
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          marginTop: 6,
          width: "100%",
          minHeight: 36,
          padding: 4,
          boxSizing: "border-box",
          border: "1px solid #ddd",
          borderRadius: 3,
          fontFamily: "inherit",
          fontSize: 10,
          color: "#444",
          background: "#fafafa",
          resize: "vertical",
        }}
      />
    </div>
  ) : null;

  return <>{chevronBtn}{panel}</>;
}
