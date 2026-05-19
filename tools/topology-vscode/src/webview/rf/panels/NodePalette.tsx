import { useState } from "react";
import { NODE_TYPES } from "../../../schema";
import { useStore } from "../../state/store";

// Drag a palette item into the canvas to mint a new node of that type at
// the drop coordinates. The actual mint happens in app.tsx onDrop, which
// reads the type string from dataTransfer; this component is presentation
// + drag start only.
export const PALETTE_DATA_TYPE = "application/wirefold-node-type";

export function NodePalette() {
  const specNodes = useStore((s) => s.spec.nodes);
  const [collapsed, setCollapsed] = useState(false);
  const usedTypes = new Set(specNodes.map((n) => n.type));
  const allTypes = Object.keys(NODE_TYPES);
  // If the diagram is empty show all kinds; otherwise show only kinds in use.
  const types = usedTypes.size === 0 ? allTypes : allTypes.filter((t) => usedTypes.has(t));
  return (
    <div className={"palette-panel" + (collapsed ? " collapsed" : "")}>
      <div className="palette-header">
        <button
          type="button"
          className="palette-fold"
          title={collapsed ? "expand nodes panel" : "collapse nodes panel"}
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? "▶" : "◀"}
        </button>
        {!collapsed && <span>nodes</span>}
      </div>
      {!collapsed && (
        <div className="palette-list">
          {types.map((t) => {
            const def = NODE_TYPES[t];
            return (
              <div
                key={t}
                className="palette-item"
                draggable
                onDragStart={(ev) => {
                  ev.dataTransfer.setData(PALETTE_DATA_TYPE, t);
                  ev.dataTransfer.effectAllowed = "copy";
                }}
                title={def.role}
              >
                <span
                  className="palette-swatch"
                  style={{
                    background: def.fill,
                    border: `1px solid ${def.stroke}`,
                    borderRadius: def.shape === "pill" ? 8 : 2,
                  }}
                />
                <span className="palette-name">{t}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
