// RF custom node for the "Join" kind.
// Static visual only: label, two input handles (FromA, FromB), one output.
// No simulation, no RAF, no slot phase logic.

import { Handle, Position, type NodeProps } from "reactflow";

interface JoinNodeData {
  label?: string;
}

export function JoinNode({ data }: NodeProps<JoinNodeData>) {
  return (
    <div style={styles.container}>
      <Handle type="target" position={Position.Left} id="FromA" style={{ ...styles.handle, top: "30%" }} />
      <Handle type="target" position={Position.Left} id="FromB" style={{ ...styles.handle, top: "70%" }} />
      <div style={styles.label}>{data.label ?? "join"}</div>
      <div style={styles.sublabel}>A + B</div>
      <Handle type="source" position={Position.Right} id="ToJoined" style={styles.handle} />
    </div>
  );
}

const styles = {
  container: {
    background: "#1a1f2e",
    border: "1px solid #58a6ff",
    borderRadius: 4,
    padding: "6px 10px",
    minWidth: 80,
    fontFamily: "monospace",
    fontSize: 11,
    color: "#c9d1d9",
  },
  label: {
    fontWeight: 700,
    color: "#58a6ff",
    textAlign: "center" as const,
  },
  sublabel: {
    fontSize: 9,
    color: "#8b949e",
    textAlign: "center" as const,
  },
  handle: {
    background: "#58a6ff",
  },
} as const;
