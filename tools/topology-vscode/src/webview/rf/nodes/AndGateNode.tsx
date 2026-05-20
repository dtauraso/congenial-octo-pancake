// RF custom node for the "AndGate" kind.
// Static visual only: label, two input handles (FromA, FromB), one output (ToOut).
// No simulation, no RAF, no slot phase logic.

import { Handle, Position, type NodeProps } from "reactflow";
import { useFireFlash } from "./use-fire-flash";

interface AndGateNodeData {
  label?: string;
  lastFire?: number;
}

export function AndGateNode({ data }: NodeProps<AndGateNodeData>) {
  const flashing = useFireFlash(data.lastFire);
  return (
    <div style={{ ...styles.container, boxShadow: flashing ? "0 0 8px 2px #1565c0" : undefined }}>
      <Handle type="target" position={Position.Left} id="FromA" style={{ ...styles.handle, top: "30%" }} />
      <Handle type="target" position={Position.Left} id="FromB" style={{ ...styles.handle, top: "70%" }} />
      <div style={styles.label}>{data.label ?? "andGate"}</div>
      <Handle type="source" position={Position.Right} id="ToOut" style={styles.outHandle} />
    </div>
  );
}

const styles = {
  container: {
    background: "#e3f2fd",
    border: "1px solid #1565c0",
    borderRadius: 4,
    padding: "6px 10px",
    minWidth: 70,
    fontFamily: "monospace",
    fontSize: 11,
    color: "#0d47a1",
  },
  label: {
    fontWeight: 700,
    color: "#1565c0",
    textAlign: "center" as const,
  },
  handle: {
    background: "#1565c0",
  },
  outHandle: {
    background: "#42a5f5",
  },
} as const;
