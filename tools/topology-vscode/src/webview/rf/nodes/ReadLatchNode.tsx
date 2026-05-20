// RF custom node for the "ReadLatch" kind.
// Static visual only: label, two input handles (in, release), one output.
// No simulation, no RAF, no slot phase logic.

import { Handle, Position, type NodeProps } from "reactflow";

interface ReadLatchNodeData {
  label?: string;
}

export function ReadLatchNode({ data }: NodeProps<ReadLatchNodeData>) {
  return (
    <div style={styles.container}>
      <Handle type="target" position={Position.Left} id="in" style={{ ...styles.handle, top: "30%" }} />
      <Handle type="target" position={Position.Left} id="release" style={{ ...styles.releaseHandle, top: "70%" }} />
      <div style={styles.label}>{data.label ?? "readlatch"}</div>
      <div style={styles.sublabel}>in / rel</div>
      <Handle type="source" position={Position.Right} id="out" style={styles.handle} />
    </div>
  );
}

const styles = {
  container: {
    background: "#e0f7fa",
    border: "1px solid #00838f",
    borderRadius: 4,
    padding: "6px 10px",
    minWidth: 90,
    fontFamily: "monospace",
    fontSize: 11,
    color: "#006064",
  },
  label: {
    fontWeight: 700,
    color: "#00838f",
    textAlign: "center" as const,
  },
  sublabel: {
    fontSize: 9,
    color: "#8b949e",
    textAlign: "center" as const,
  },
  handle: {
    background: "#00838f",
  },
  releaseHandle: {
    background: "#80cbc4",
  },
} as const;
