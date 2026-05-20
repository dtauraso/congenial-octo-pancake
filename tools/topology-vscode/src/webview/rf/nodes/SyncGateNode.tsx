// RF custom node for the "SyncGate" kind.
// Static visual only: label, two input handles (a, b), one output (release).
// No simulation, no RAF, no slot phase logic.

import { Handle, Position, type NodeProps } from "reactflow";

interface SyncGateNodeData {
  label?: string;
}

export function SyncGateNode({ data }: NodeProps<SyncGateNodeData>) {
  return (
    <div style={styles.container}>
      <Handle type="target" position={Position.Left} id="a" style={{ ...styles.handle, top: "30%" }} />
      <Handle type="target" position={Position.Left} id="b" style={{ ...styles.handle, top: "70%" }} />
      <div style={styles.label}>{data.label ?? "syncGate"}</div>
      <Handle type="source" position={Position.Right} id="release" style={styles.releaseHandle} />
    </div>
  );
}

const styles = {
  container: {
    background: "#f3e5f5",
    border: "1px solid #7b1fa2",
    borderRadius: 4,
    padding: "6px 10px",
    minWidth: 70,
    fontFamily: "monospace",
    fontSize: 11,
    color: "#4a148c",
  },
  label: {
    fontWeight: 700,
    color: "#7b1fa2",
    textAlign: "center" as const,
  },
  handle: {
    background: "#7b1fa2",
  },
  releaseHandle: {
    background: "#80cbc4",
  },
} as const;
