// RF custom node for the "Partition" kind.
// Static visual only: label, one input handle (in), one output handle (out).
// No simulation, no RAF, no slot phase logic.

import { Handle, Position, type NodeProps } from "reactflow";

interface PartitionNodeData {
  label?: string;
}

export function PartitionNode({ data }: NodeProps<PartitionNodeData>) {
  return (
    <div style={styles.container}>
      <Handle type="target" position={Position.Left} id="in" style={styles.handle} />
      <div style={styles.label}>{data.label ?? "partition"}</div>
      <Handle type="source" position={Position.Right} id="out" style={styles.handle} />
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
