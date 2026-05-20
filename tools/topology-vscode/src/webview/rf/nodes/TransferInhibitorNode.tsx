// RF custom node for the "TransferInhibitor" kind.
// Static visual only: kind name and ports. TransferInhibitor is not yet in
// the schema node-types registry; ports are rendered minimally until the
// schema entry lands.
// No simulation, no RAF, no slot phase logic.

import { Handle, Position, type NodeProps } from "reactflow";

interface TransferInhibitorNodeData {
  label?: string;
}

export function TransferInhibitorNode({ data }: NodeProps<TransferInhibitorNodeData>) {
  return (
    <div style={styles.container}>
      <Handle type="target" position={Position.Left} id="in" style={styles.handle} />
      <div style={styles.label}>{data.label ?? "transferInhibitor"}</div>
      <Handle type="source" position={Position.Right} id="out" style={styles.handle} />
    </div>
  );
}

const styles = {
  container: {
    background: "#fff3e0",
    border: "1px solid #bf360c",
    borderRadius: 4,
    padding: "6px 10px",
    minWidth: 120,
    fontFamily: "monospace",
    fontSize: 11,
    color: "#bf360c",
  },
  label: {
    fontWeight: 700,
    color: "#bf360c",
    textAlign: "center" as const,
  },
  handle: {
    background: "#bf360c",
  },
} as const;
