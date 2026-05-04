import { NODE_TYPES } from "../../schema";

// Drag a palette item into the canvas to mint a new node of that type at
// the drop coordinates. The actual mint happens in app.tsx onDrop, which
// reads the type string from dataTransfer; this component is presentation
// + drag start only.
export const PALETTE_DATA_TYPE = "application/wirefold-node-type";

export function NodePalette() {
  const types = Object.keys(NODE_TYPES);
  return (
    <div className="palette-panel">
      <div className="palette-header">nodes</div>
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
    </div>
  );
}
