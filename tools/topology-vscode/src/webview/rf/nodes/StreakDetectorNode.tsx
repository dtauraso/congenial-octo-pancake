// RF custom node for the "StreakDetector" kind.
// Static visual only: label, two input handles (old, new), two outputs (done, streak).
// No simulation, no RAF, no slot phase logic.

import { Handle, Position, type NodeProps } from "reactflow";
import { useFireFlash } from "./use-fire-flash";

interface StreakDetectorNodeData {
  label?: string;
  lastFire?: number;
}

export function StreakDetectorNode({ data }: NodeProps<StreakDetectorNodeData>) {
  const flashing = useFireFlash(data.lastFire);
  return (
    <div style={{ ...styles.container, boxShadow: flashing ? "0 0 8px 2px #2e7d32" : undefined }}>
      <Handle type="target" position={Position.Left} id="old" style={{ ...styles.handle, top: "30%" }} />
      <Handle type="target" position={Position.Left} id="new" style={{ ...styles.handle, top: "70%" }} />
      <div style={styles.label}>{data.label ?? "streakDetector"}</div>
      <Handle type="source" position={Position.Right} id="done" style={{ ...styles.handle, top: "35%" }} />
      <Handle type="source" position={Position.Right} id="streak" style={{ ...styles.streakHandle, top: "65%" }} />
    </div>
  );
}

const styles = {
  container: {
    background: "#e8f5e9",
    border: "1px solid #2e7d32",
    borderRadius: 4,
    padding: "6px 10px",
    minWidth: 100,
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
  streakHandle: {
    background: "#66bb6a",
  },
} as const;
