// RF custom node for the "StreakBreakDetector" kind.
// Static visual only: label, two input handles (old, new), one output (done).
// No simulation, no RAF, no slot phase logic.

import { Handle, Position, type NodeProps } from "reactflow";
import { useFireFlash } from "./use-fire-flash";

interface StreakBreakDetectorNodeData {
  label?: string;
  lastFire?: number;
}

export function StreakBreakDetectorNode({ data }: NodeProps<StreakBreakDetectorNodeData>) {
  const flashing = useFireFlash(data.lastFire);
  return (
    <div style={{ ...styles.container, boxShadow: flashing ? "0 0 8px 2px #c62828" : undefined }}>
      <Handle type="target" position={Position.Left} id="old" style={{ ...styles.handle, top: "30%" }} />
      <Handle type="target" position={Position.Left} id="new" style={{ ...styles.handle, top: "70%" }} />
      <div style={styles.label}>{data.label ?? "streakBreakDetector"}</div>
      <Handle type="source" position={Position.Right} id="done" style={styles.handle} />
    </div>
  );
}

const styles = {
  container: {
    background: "#ffebee",
    border: "1px solid #c62828",
    borderRadius: 4,
    padding: "6px 10px",
    minWidth: 110,
    fontFamily: "monospace",
    fontSize: 11,
    color: "#b71c1c",
  },
  label: {
    fontWeight: 700,
    color: "#c62828",
    textAlign: "center" as const,
  },
  handle: {
    background: "#c62828",
  },
} as const;
