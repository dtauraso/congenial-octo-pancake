import type { AnimatedNodeData } from "./_types";

export function NodeBody({
  data,
  selected,
  stateText,
}: {
  data: AnimatedNodeData;
  selected: boolean;
  stateText: string[];
}) {
  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
      }}
    >
      <div className="node-label" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{data.label}</div>
      {data.sublabel ? (
        <div className="node-sublabel">{data.sublabel}</div>
      ) : selected ? (
        <div className="node-sublabel node-sublabel-placeholder">+ sublabel</div>
      ) : null}
      {stateText.length > 0
        ? stateText.map((line, i) => (
            <div key={i} style={{ fontFamily: "monospace", fontSize: 10 }}>
              {line}
            </div>
          ))
        : data.state
          ? Object.entries(data.state)
              // dx/dy are presentation (Phase 6 motion). Suppress so the
              // sub-rows show only domain state (latch slots etc.).
              .filter(([k]) => k !== "dx" && k !== "dy")
              .map(([k, v]) => (
                <div
                  key={k}
                  className="node-state-row"
                  style={{ fontFamily: "monospace", fontSize: 10, color: "#444" }}
                >
                  {k}={String(v)}
                </div>
              ))
          : null}
    </div>
  );
}
