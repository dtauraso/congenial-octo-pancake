// RF custom node for the "ReadGate" kind.
// Static visual only: label, two input handles (FromValue, FromAck), one output.
// No simulation, no RAF, no slot phase logic.

import { Handle, Position, type NodeProps } from "reactflow";

interface ReadGateNodeData {
  label?: string;
}

export function ReadGateNode({ data }: NodeProps<ReadGateNodeData>) {
  return (
    <div style={styles.container}>
      <Handle type="target" position={Position.Left} id="FromValue" style={{ ...styles.handle, top: "30%" }} />
      <Handle type="target" position={Position.Left} id="FromAck" style={{ ...styles.handle, top: "70%" }} />
      <div style={styles.label}>{data.label ?? "readgate"}</div>
      <div style={styles.sublabel}>val / ack</div>
      <Handle type="source" position={Position.Right} id="ToGated" style={styles.handle} />
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
  sublabel: {
    fontSize: 9,
    color: "#8b949e",
    textAlign: "center" as const,
  },
  handle: {
    background: "#7b1fa2",
  },
} as const;
