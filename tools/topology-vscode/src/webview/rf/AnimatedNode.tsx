import { useEffect, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { KIND_COLORS, type Port, type StateValue } from "../../schema";
import { stepToNode, subscribe, getWorld, getTickMs } from "../../sim/runner";

// Visible port dot. Sized large enough to be a real drag target, colored by
// the port's edge kind so users can see which kinds connect to which.
function portStyle(side: "left" | "right", topPct: number, color: string): React.CSSProperties {
  return {
    width: 8, height: 8, minWidth: 0, minHeight: 0,
    [side]: -4, top: `${topPct}%`,
    transform: "translate(0, -50%)",
    background: color, border: "1px solid #fff",
    borderRadius: 4,
  };
}

const HANDLE_STYLE_LEFT: React.CSSProperties = {
  width: 1, height: 1, minWidth: 0, minHeight: 0,
  left: 0, top: "50%",
  transform: "translate(0, -50%)",
  background: "transparent", border: "none", pointerEvents: "none",
};
const HANDLE_STYLE_RIGHT: React.CSSProperties = {
  width: 1, height: 1, minWidth: 0, minHeight: 0,
  right: 0, top: "50%",
  transform: "translate(0, -50%)",
  background: "transparent", border: "none", pointerEvents: "none",
};

export type AnimatedNodeData = {
  label: string;
  sublabel?: string;
  type: string;
  fill: string;
  stroke: string;
  shape: "rect" | "pill";
  width: number;
  height: number;
  inputs: Port[];
  outputs: Port[];
  state?: Record<string, StateValue>;
};

const FLASH_DURATION_MS = 300;

export function AnimatedNode(props: NodeProps<AnimatedNodeData>) {
  const { id, data, selected } = props;
  const flashRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to runner fire events for this node id; play one-shot
  // flash. State-text updates piggyback on the same event channel — we
  // re-render with the latest input port + value seen by this node.
  const [stateText, setStateText] = useState<string[]>([]);
  // Phase 6 Chunk A: motion is a derived view of simulator state. On
  // each fire for this node we read world.state[id] for dx/dy and
  // apply a CSS transform tween over the current tick interval. Default
  // (0,0) when the node has no motion handler — pure event-triggered
  // flash topologies render unchanged.
  const [offset, setOffset] = useState<{ dx: number; dy: number }>(() => {
    const s = getWorld()?.state?.[id];
    return { dx: Number(s?.dx ?? 0), dy: Number(s?.dy ?? 0) };
  });
  const [tweenMs, setTweenMs] = useState<number>(getTickMs());

  useEffect(() => {
    const unsub = subscribe((ev) => {
      if (ev.type !== "fire" || ev.nodeId !== id) return;
      const el = flashRef.current;
      if (el) {
        // Cancel any in-progress flash so a rapid retrigger restarts at
        // full opacity instead of compositing a faded one.
        el.getAnimations().forEach((a) => a.cancel());
        el.animate(
          [
            { opacity: 0 },
            { opacity: 0.5, offset: 0.5 },
            { opacity: 0 },
          ],
          { duration: FLASH_DURATION_MS },
        );
      }
      setStateText([`${ev.inputPort}=${ev.inputValue}`]);
      const s = getWorld()?.state?.[id];
      setOffset({ dx: Number(s?.dx ?? 0), dy: Number(s?.dy ?? 0) });
      setTweenMs(getTickMs());
    });
    return unsub;
  }, [id]);

  const radius = data.shape === "pill" ? data.height / 2 : 4;

  // Per-node step affordance (N2). Visible only when the node is
  // selected so it doesn't clutter the unfocused canvas. Click drives
  // the simulator forward until the next event delivered to this node;
  // useful for "show me what happens next *here*" without globally
  // playing/pausing the rest of the topology.
  const stepBtn = selected ? (
    <button
      className="node-step-btn"
      title={`step until next event on ${id}`}
      onClick={(e) => {
        e.stopPropagation();
        stepToNode(id);
      }}
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
        background: "#fff",
        cursor: "pointer",
        zIndex: 2,
      }}
    >
      ⏭
    </button>
  ) : null;

  return (
    <div
      style={{
        position: "relative",
        minWidth: data.width,
        width: "max-content",
        height: data.height,
        background: data.fill,
        color: "#1a1a1a",
        border: `${selected ? 2 : 1}px solid ${data.stroke}`,
        borderRadius: radius,
        fontSize: 11,
        padding: "4px 8px",
        boxSizing: "border-box",
        overflow: "visible",
        isolation: "isolate",
        transform: `translate(${offset.dx}px, ${offset.dy}px)`,
        transition: `transform ${tweenMs}ms linear`,
        willChange: "transform",
      }}
    >
      {stepBtn}
      <div
        ref={flashRef}
        style={{
          position: "absolute",
          inset: 0,
          background: "white",
          opacity: 0,
          borderRadius: radius,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {data.inputs.length === 0 ? (
        <Handle type="target" position={Position.Left} style={HANDLE_STYLE_LEFT} isConnectable={false} />
      ) : (
        data.inputs.map((p, i) => (
          <Handle
            key={`in-${p.name}`}
            id={p.name}
            type="target"
            position={Position.Left}
            style={portStyle("left", ((i + 1) * 100) / (data.inputs.length + 1), KIND_COLORS[p.kind] ?? "#888")}
            title={`${p.name} (${p.kind})`}
          />
        ))
      )}
      {data.outputs.length === 0 ? (
        <Handle type="source" position={Position.Right} style={HANDLE_STYLE_RIGHT} isConnectable={false} />
      ) : (
        data.outputs.map((p, i) => (
          <Handle
            key={`out-${p.name}`}
            id={p.name}
            type="source"
            position={Position.Right}
            style={portStyle("right", ((i + 1) * 100) / (data.outputs.length + 1), KIND_COLORS[p.kind] ?? "#888")}
            title={`${p.name} (${p.kind})`}
          />
        ))
      )}
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
                // dx/dy are presentation (Phase 6 motion). Suppress so
                // the sub-rows show only domain state (latch slots etc.)
                // not the rendering offset.
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
    </div>
  );
}
