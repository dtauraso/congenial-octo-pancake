// RF custom node for the "SyncGate" kind.
// Static visual only: label, two input handles (a, b), one output (release).
// No simulation, no RAF, no slot phase logic.

import { Handle, Position, type NodeProps } from "reactflow";
import { useFireFlash } from "./use-fire-flash";

interface SyncGateNodeData {
  label?: string;
  lastFire?: number;
}

export function SyncGateNode({ data }: NodeProps<SyncGateNodeData>) {
  const flashing = useFireFlash(data.lastFire);
  return (
    <div style={{ ...styles.container, boxShadow: flashing ? "0 0 8px 2px #7b1fa2" : undefined }}>
      <Handle type="target" position={Position.Left} id="FromA" style={{ ...styles.handle, top: "30%" }} />
      <Handle type="target" position={Position.Left} id="FromB" style={{ ...styles.handle, top: "70%" }} />
      <div style={styles.label}>{data.label ?? "syncGate"}</div>
      <Handle type="source" position={Position.Right} id="ToRelease" style={styles.releaseHandle} />
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
