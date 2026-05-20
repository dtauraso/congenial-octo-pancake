// RF custom node for the "Inhibitor" kind.
// Static visual only: kind name and ports. Inhibitor is not yet in the
// schema node-types registry; ports are rendered minimally until the
// schema entry lands.
// No simulation, no RAF, no slot phase logic.

import { Handle, Position, type NodeProps } from "reactflow";

interface InhibitorNodeData {
  label?: string;
}

export function InhibitorNode({ data }: NodeProps<InhibitorNodeData>) {
  return (
    <div style={styles.container}>
      <Handle type="target" position={Position.Left} id="in" style={styles.handle} />
      <div style={styles.label}>{data.label ?? "inhibitor"}</div>
      <Handle type="source" position={Position.Right} id="out" style={styles.handle} />
    </div>
  );
}

const styles = {
  container: {
    background: "#fff3e0",
    border: "1px solid #e65100",
    borderRadius: 4,
    padding: "6px 10px",
    minWidth: 90,
    fontFamily: "monospace",
    fontSize: 11,
    color: "#bf360c",
  },
  label: {
    fontWeight: 700,
    color: "#e65100",
    textAlign: "center" as const,
  },
  handle: {
    background: "#e65100",
  },
} as const;
