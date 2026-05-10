import { useSyncExternalStore } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { KIND_COLORS } from "../../../schema";
import { subscribeFrame, getFrameSnapshot } from "../../frame-store";
import type { NodeFrameMsgState } from "../../../messages";
import { portStyle, HANDLE_STYLE_LEFT, HANDLE_STYLE_RIGHT } from "./_styles";
import { SpecPanel } from "./SpecPanel";
import { NodeBody } from "./NodeBody";
import type { AnimatedNodeData } from "./_types";

export function AnimatedNode(props: NodeProps<AnimatedNodeData>) {
  const { id, data, selected } = props;

  const frame = useSyncExternalStore(subscribeFrame, getFrameSnapshot, getFrameSnapshot);
  const frameNodeState = frame.nodes.get(id);

  const radius = data.shape === "pill" ? data.height / 2 : 4;
  const frameStyle = frameNodeStyle(frameNodeState);
  const fill = frameStyle?.fill ?? data.fill;
  const borderColor = frameStyle?.border ?? data.stroke;

  return (
    <div
      style={{
        position: "relative",
        minWidth: data.width,
        width: "max-content",
        height: data.height,
        background: fill,
        color: "#1a1a1a",
        border: `${selected ? 2 : 1}px solid ${borderColor}`,
        borderRadius: radius,
        fontSize: 11,
        padding: "4px 8px",
        boxSizing: "border-box",
        overflow: "visible",
        isolation: "isolate",
      }}
    >
      <SpecPanel id={id} data={data} />
      {data.inputs.length === 0 ? (
        <Handle type="target" position={Position.Left} style={HANDLE_STYLE_LEFT} isConnectable={false} />
      ) : (
        data.inputs.map((p, i) => (
          <Handle
            key={`in-${p.name}`}
            id={p.name}
            type="target"
            position={Position.Left}
            style={portStyle("left", ((i + 1) * 100) / (data.inputs.length + 1), KIND_COLORS[p.kind] ?? "#888", false)}
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
      <NodeBody data={data} selected={!!selected} stateText={[]} />
    </div>
  );
}

// Four-state palette for the frame-mode painter.
function frameNodeStyle(s: NodeFrameMsgState | undefined): { fill: string; border: string } | null {
  switch (s) {
    case "running":      return { fill: "#ffd54f", border: "#fbc02d" };
    case "parked-output": return { fill: "#66bb6a", border: "#388e3c" };
    case "parked-ack":   return { fill: "#42a5f5", border: "#1976d2" };
    case "parked-input": return { fill: "#2a2a2a", border: "#555" };
    default:             return null;
  }
}
