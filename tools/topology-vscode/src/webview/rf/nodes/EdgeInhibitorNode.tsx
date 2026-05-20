// RF custom node for the "EdgeInhibitor" kind.
// Static visual only: kind name and ports. EdgeInhibitor is not yet in the
// schema node-types registry; ports are rendered minimally until the
// schema entry lands.
// No simulation, no RAF, no slot phase logic.

import { Handle, Position, type NodeProps } from "reactflow";

interface EdgeInhibitorNodeData {
  label?: string;
}

export function EdgeInhibitorNode({ data }: NodeProps<EdgeInhibitorNodeData>) {
  return (
    <div style={styles.container}>
      <Handle type="target" position={Position.Left} id="in" style={styles.handle} />
      <div style={styles.label}>{data.label ?? "edgeInhibitor"}</div>
      <Handle type="source" position={Position.Right} id="out" style={styles.handle} />
    </div>
  );
}

const styles = {
  container: {
    background: "#fff3e0",
    border: "1px solid #ff6f00",
    borderRadius: 4,
    padding: "6px 10px",
    minWidth: 100,
    fontFamily: "monospace",
    fontSize: 11,
    color: "#e65100",
  },
  label: {
    fontWeight: 700,
    color: "#ff6f00",
    textAlign: "center" as const,
  },
  handle: {
    background: "#ff6f00",
  },
} as const;
