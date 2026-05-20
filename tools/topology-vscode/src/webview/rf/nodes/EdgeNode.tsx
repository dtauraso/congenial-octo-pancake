// RF custom node for the "EdgeNode" kind (schema key: "EdgeNode").
// Static visual only: label, two input handles (left, right), three outputs.
// No simulation, no RAF, no slot phase logic.

import { Handle, Position, type NodeProps } from "reactflow";

interface EdgeNodeData {
  label?: string;
}

export function EdgeNode({ data }: NodeProps<EdgeNodeData>) {
  return (
    <div style={styles.container}>
      <Handle type="target" position={Position.Left} id="left" style={{ ...styles.handle, top: "35%" }} />
      <Handle type="target" position={Position.Left} id="right" style={{ ...styles.handle, top: "65%" }} />
      <div style={styles.label}>{data.label ?? "edge"}</div>
      <Handle type="source" position={Position.Right} id="outInhibitor" style={{ ...styles.handle, top: "25%" }} />
      <Handle type="source" position={Position.Right} id="outPartition" style={{ ...styles.handle, top: "50%" }} />
      <Handle type="source" position={Position.Right} id="outNextEdge" style={{ ...styles.handle, top: "75%" }} />
    </div>
  );
}

const styles = {
  container: {
    background: "#fff8e1",
    border: "1px solid #ff6f00",
    borderRadius: 4,
    padding: "6px 10px",
    minWidth: 90,
    fontFamily: "monospace",
    fontSize: 11,
    color: "#e65100",
  },
  label: {
    fontWeight: 700,
    color: "#ff6f00",
    textAlign: "center" as const,
  },
  handle: {
    background: "#ff6f00",
  },
} as const;
