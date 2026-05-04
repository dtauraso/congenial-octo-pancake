import { useEffect, useMemo, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { KIND_COLORS, type NodeSpec, type Port, type StateValue } from "../../schema";
import { stepToNode, subscribe, getWorld, getTickMs } from "../../sim/runner";
import { bufferedPorts } from "../../sim/handlers";
import { mutateSpec, useSpec } from "../state";
import { outgoingEdgeColors } from "./spec-colors";

// Visible port dot. Sized large enough to be a real drag target, colored by
// the port's edge kind so users can see which kinds connect to which.
function portStyle(
  side: "left" | "right",
  topPct: number,
  color: string,
  buffered = false,
): React.CSSProperties {
  return {
    width: 8, height: 8, minWidth: 0, minHeight: 0,
    [side]: -4, top: `${topPct}%`,
    transform: "translate(0, -50%)",
    background: color, border: "1px solid #fff",
    borderRadius: 4,
    // Halo ring marks an input that has buffered a value and is waiting
    // for its peer (AND-style joins). Distinct from the fire/glow pulse —
    // halo is the idle "input X waiting" indicator (audit row #4).
    ...(buffered ? { boxShadow: `0 0 0 2px ${color}` } : {}),
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
  spec?: NodeSpec;
  notes?: string;
};

const FLASH_DURATION_MS = 300;

export function AnimatedNode(props: NodeProps<AnimatedNodeData>) {
  const { id, data, selected } = props;
  const flashRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

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
  // Held-value tint: SMIL reference cycles inhibitor fill color across
  // the loop to show which value is currently held (#ffab40 for +1,
  // #66bb6a for −1, neutral otherwise). Drive that from runner state
  // (state.held) instead of a baked time loop.
  const [held, setHeld] = useState<StateValue | undefined>(() => getWorld()?.state?.[id]?.held);
  // Audit row #4: per-port "input X waiting" indicator. State already
  // exists as state.__has_<port>=1; bufferedPorts() reads it. Refreshed
  // on every fire for this node since arrivals + clears both fire.
  const [buffered, setBuffered] = useState<string[]>(() => bufferedPorts(getWorld()?.state?.[id]));

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
      // Outline glow pulse — SMIL p0 used stroke-width 0;0;0;0;2;1;0;0
      // and opacity 0;0;0;0;0.8;0.4;0;0 to mark partition activation.
      // Drive the same shape from runner fire events instead of a time
      // loop, applied to every node so any activation reads visually.
      const gl = glowRef.current;
      if (gl) {
        gl.getAnimations().forEach((a) => a.cancel());
        gl.animate(
          [
            { boxShadow: `0 0 0 0 ${data.stroke}00`, opacity: 0 },
            { boxShadow: `0 0 0 4px ${data.stroke}cc`, opacity: 0.8, offset: 0.4 },
            { boxShadow: `0 0 0 2px ${data.stroke}66`, opacity: 0.4, offset: 0.7 },
            { boxShadow: `0 0 0 0 ${data.stroke}00`, opacity: 0 },
          ],
          { duration: FLASH_DURATION_MS },
        );
      }
      setStateText([`${ev.inputPort}=${ev.inputValue}`]);
      const s = getWorld()?.state?.[id];
      setOffset({ dx: Number(s?.dx ?? 0), dy: Number(s?.dy ?? 0) });
      setTweenMs(getTickMs());
      setHeld(s?.held);
      setBuffered(bufferedPorts(s));
    });
    return unsub;
  }, [id]);

  const radius = data.shape === "pill" ? data.height / 2 : 4;
  const heldNum = typeof held === "number" ? held : Number(held);
  const heldFill =
    heldNum === 1 ? "#ffab40" :
    heldNum === -1 ? "#66bb6a" :
    null;
  const fill = heldFill ?? data.fill;

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
        left: -10,
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

  // Inline spec/notes panel. Spec is AI-authored prose; notes is human
  // (rendered editable in commit 4). outputRef segments resolve to the
  // live outgoing edge's kind color so renaming an edge recolors prose
  // automatically. Expansion is pure presentation — local useState, not
  // persisted, so it never drifts spec semantics.
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
  const specPanel = expanded ? (
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

  return (
    <div
      style={{
        position: "relative",
        minWidth: data.width,
        width: "max-content",
        height: data.height,
        background: fill,
        color: "#1a1a1a",
        border: `${selected ? 2 : 1}px solid ${data.stroke}`,
        borderRadius: radius,
        fontSize: 11,
        padding: "4px 8px",
        boxSizing: "border-box",
        overflow: "visible",
        isolation: "isolate",
        transform: `translate(${offset.dx}px, ${offset.dy}px)`,
        transition: `transform ${tweenMs}ms linear, background-color ${tweenMs}ms linear`,
        willChange: "transform",
      }}
    >
      {stepBtn}
      {chevronBtn}
      {specPanel}
      <div
        ref={glowRef}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: radius,
          pointerEvents: "none",
          opacity: 0,
          zIndex: -1,
        }}
      />
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
            style={portStyle("left", ((i + 1) * 100) / (data.inputs.length + 1), KIND_COLORS[p.kind] ?? "#888", buffered.includes(p.name))}
            title={`${p.name} (${p.kind})${buffered.includes(p.name) ? " — buffered, waiting for peer" : ""}`}
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
