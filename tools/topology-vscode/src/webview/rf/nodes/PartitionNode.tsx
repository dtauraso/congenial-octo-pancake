// RF custom node for the "Partition" kind.
// Static visual only: label, one input handle (in), one output handle (out).
// No simulation, no RAF, no slot phase logic.

import { Handle, Position, type NodeProps } from "reactflow";
import { useFireFlash } from "./use-fire-flash";

interface PartitionNodeData {
  label?: string;
  lastFire?: number;
}

export function PartitionNode({ data }: NodeProps<PartitionNodeData>) {
  const flashing = useFireFlash(data.lastFire);
  return (
    <div style={{ ...styles.container, boxShadow: flashing ? "0 0 8px 2px #ad1457" : undefined }}>
      <Handle type="target" position={Position.Left} id="FromIn" style={styles.handle} />
      <div style={styles.label}>{data.label ?? "partition"}</div>
      <Handle type="source" position={Position.Right} id="ToOut" style={styles.handle} />
    </div>
  );
}

const styles = {
  container: {
    background: "#fce4ec",
    border: "1px solid #ad1457",
    borderRadius: 4,
    padding: "6px 10px",
    minWidth: 90,
    fontFamily: "monospace",
    fontSize: 11,
    color: "#880e4f",
  },
  label: {
    fontWeight: 700,
    color: "#ad1457",
    textAlign: "center" as const,
  },
  handle: {
    background: "#ad1457",
  },
} as const;
