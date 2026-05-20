// RF custom node for the "InhibitRightGate" kind.
// Static visual only: label, two input handles (FromLeft, FromRight), one output.
// No simulation, no RAF, no slot phase logic.

import { Handle, Position, type NodeProps } from "reactflow";
import { useFireFlash } from "./use-fire-flash";

interface InhibitRightGateNodeData {
  label?: string;
  lastFire?: number;
}

export function InhibitRightGateNode({ data }: NodeProps<InhibitRightGateNodeData>) {
  const flashing = useFireFlash(data.lastFire);
  return (
    <div style={{ ...styles.container, boxShadow: flashing ? "0 0 8px 2px #880e4f" : undefined }}>
      <Handle type="target" position={Position.Left} id="FromLeft" style={{ ...styles.handle, top: "30%" }} />
      <Handle type="target" position={Position.Left} id="FromRight" style={{ ...styles.inhibitHandle, top: "70%" }} />
      <div style={styles.label}>{data.label ?? "inhibitRightGate"}</div>
      <div style={styles.sublabel}>L pass / R inhibit</div>
      <Handle type="source" position={Position.Right} id="ToPassed" style={styles.handle} />
    </div>
  );
}

const styles = {
  container: {
    background: "#fce4ec",
    border: "1px solid #880e4f",
    borderRadius: 4,
    padding: "6px 10px",
    minWidth: 110,
    fontFamily: "monospace",
    fontSize: 11,
    color: "#880e4f",
  },
  label: {
    fontWeight: 700,
    color: "#880e4f",
    textAlign: "center" as const,
  },
  sublabel: {
    fontSize: 9,
    color: "#8b949e",
    textAlign: "center" as const,
  },
  handle: {
    background: "#880e4f",
  },
  inhibitHandle: {
    background: "#f48fb1",
  },
} as const;
