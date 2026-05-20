// RF custom node for the "Relay" kind.
// Static visual only: label, one input handle, one output handle.
// No simulation, no RAF, no slot phase logic.

import { Handle, Position, type NodeProps } from "reactflow";

interface RelayNodeData {
  label?: string;
}

export function RelayNode({ data }: NodeProps<RelayNodeData>) {
  return (
    <div style={styles.container}>
      <Handle type="target" position={Position.Left} id="FromIn" style={styles.handle} />
      <div style={styles.label}>{data.label ?? "relay"}</div>
      <Handle type="source" position={Position.Right} id="ToOut" style={styles.handle} />
    </div>
  );
}

const styles = {
  container: {
    background: "#e8f5e9",
    border: "1px solid #2e7d32",
    borderRadius: 4,
    padding: "6px 10px",
    minWidth: 70,
    fontFamily: "monospace",
    fontSize: 11,
    color: "#1b5e20",
  },
  label: {
    fontWeight: 700,
    color: "#2e7d32",
    textAlign: "center" as const,
  },
  handle: {
    background: "#2e7d32",
  },
} as const;
